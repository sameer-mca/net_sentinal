<#
.SYNOPSIS
  NetSentinel Live Intrusion Detection Test
  Validates that rule-based detection triggers on real physical network traffic.
#>

param(
    [string]$Interface = "",
    [switch]$WaitForScan
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "NetSentinel Live Detection Verification" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Read backend/.env
$backendEnvPath = Join-Path $PSScriptRoot "..\backend\.env"
$adminEmail = "admin@netsentinel.local"
$adminPassword = "Admin@12345"
$port = 5000

if (Test-Path $backendEnvPath) {
    Get-Content $backendEnvPath | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line.Split("=", 2)
            if ($parts.Length -eq 2) {
                $key = $parts[0].Trim()
                $val = $parts[1].Trim()
                if ($key -eq "ADMIN_EMAIL") { $adminEmail = $val }
                if ($key -eq "ADMIN_PASSWORD") { $adminPassword = $val }
                if ($key -eq "PORT") { $port = [int]$val }
            }
        }
    }
}

$baseUrl = "http://localhost:$port"

# 2. Log in as admin
Write-Host "`n[1/8] Authenticating with NetSentinel API ($baseUrl)..." -ForegroundColor Yellow
$loginBody = @{
    email    = $adminEmail
    password = $adminPassword
} | ConvertTo-Json

try {
    $loginRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginRes.token
    $headers = @{ Authorization = "Bearer $token" }
    Write-Host "  Authenticated successfully as $adminEmail" -ForegroundColor Green
} catch {
    Write-Host "  Login failed: $_" -ForegroundColor Red
    exit 1
}

# 3. GET /api/capture/status and check engine_online
Write-Host "`n[2/8] Checking Capture Engine status..." -ForegroundColor Yellow
$statusRes = Invoke-RestMethod -Uri "$baseUrl/api/capture/status" -Headers $headers
$isEngineOnline = $statusRes.engine_online

if (-not $isEngineOnline) {
    Write-Host "Start the capture service as Administrator first" -ForegroundColor Red
    exit 1
}
Write-Host "  Capture engine is ONLINE" -ForegroundColor Green

# Determine interface
$interfaces = $statusRes.engine.interfaces
$chosenIfaceObj = $null

if ($Interface) {
    $chosenIfaceObj = $interfaces | Where-Object {
        $_.name -eq $Interface -or $_.description -eq $Interface
    } | Select-Object -First 1
}

if (-not $chosenIfaceObj) {
    # Default: find is_default = true
    $chosenIfaceObj = $interfaces | Where-Object { $_.is_default -eq $true } | Select-Object -First 1
}

if (-not $chosenIfaceObj) {
    # Fallback: recommended or first
    $chosenIfaceObj = $interfaces | Where-Object { $_.recommended -eq $true } | Select-Object -First 1
}

if (-not $chosenIfaceObj -and $interfaces.Count -gt 0) {
    $chosenIfaceObj = $interfaces[0]
}

$targetInterfaceName = if ($chosenIfaceObj) { $chosenIfaceObj.name } else { "Wi-Fi" }
Write-Host "  Target Interface: $targetInterfaceName ($($chosenIfaceObj.description))" -ForegroundColor Cyan

# 4. Resolve laptop IPv4 on the chosen interface
$laptopIp = $null
try {
    $ipObj = Get-NetIPAddress -InterfaceAlias $targetInterfaceName -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($ipObj) {
        $laptopIp = $ipObj.IPAddress
    }
} catch {}

if (-not $laptopIp -and $chosenIfaceObj.ip) {
    $laptopIp = $chosenIfaceObj.ip
}

if (-not $laptopIp) {
    $laptopIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*"
    } | Select-Object -First 1).IPAddress
}

Write-Host "  Host IPv4 Address: $laptopIp" -ForegroundColor Green

# 5. Backup all rules BEFORE changing anything
$backupPath = Join-Path $PSScriptRoot ".rules-backup.json"
Write-Host "`nBacking up detection rules to $backupPath..." -ForegroundColor Yellow
$originalRules = Invoke-RestMethod -Uri "$baseUrl/api/rules" -Headers $headers
$originalRules | ConvertTo-Json -Depth 5 | Set-Content -Path $backupPath -Encoding UTF8
Write-Host "  Backed up $($originalRules.Count) rules successfully." -ForegroundColor Green

$captureStarted = $false
$allPass = $true

try {
    # Step 3: Lower thresholds for live detection
    Write-Host "`n[3/8] Adjusting rule thresholds for live validation..." -ForegroundColor Yellow
    foreach ($r in $originalRules) {
        $targetThr = [double]$r.threshold_value
        $targetWin = [int]$r.time_window

        if ($r.attack_type -eq "icmp_flood") {
            $targetThr = 5.0
            $targetWin = 10
        } elseif ($r.attack_type -eq "syn_flood") {
            $targetThr = 5.0
            $targetWin = 10
        } elseif ($r.attack_type -eq "suspicious_dns") {
            $targetThr = 20.0
            $targetWin = 60
        }

        # Update threshold and window
        $updateBody = @{
            threshold_value = $targetThr
            time_window     = $targetWin
            severity        = $r.severity
            description     = $r.description
        } | ConvertTo-Json

        Invoke-RestMethod -Uri "$baseUrl/api/rules/$($r.id)" -Method Put -Body $updateBody -ContentType "application/json" -Headers $headers | Out-Null

        # Ensure rule is active
        if ($r.is_active -ne 1) {
            Invoke-RestMethod -Uri "$baseUrl/api/rules/$($r.id)/toggle" -Method Patch -Headers $headers | Out-Null
        }
    }

    # Fetch and display current rules
    $activeRules = Invoke-RestMethod -Uri "$baseUrl/api/rules" -Headers $headers
    Write-Host "  Active Rules Configuration for Test:" -ForegroundColor Cyan
    $activeRules | Format-Table id, attack_type, threshold_value, time_window, severity, is_active | Out-String | Write-Host

    Write-Host "  Waiting 3s for capture engine to synchronize updated rules..." -ForegroundColor Gray
    Start-Sleep -Seconds 3

    # Step 4: Start sniffer capture
    Write-Host "`n[4/8] Starting live packet capture (mode=sniffer, iface=$targetInterfaceName)..." -ForegroundColor Yellow
    $startBody = @{
        mode             = "sniffer"
        interface_name   = $targetInterfaceName
        simulate_attacks = $false
    } | ConvertTo-Json

    $startRes = Invoke-RestMethod -Uri "$baseUrl/api/capture/start" -Method Post -Body $startBody -ContentType "application/json" -Headers $headers
    $captureStarted = $true
    Write-Host "  Capture started. Initializing capture thread (waiting 5s)..." -ForegroundColor Green
    Start-Sleep -Seconds 5

    $testStartUtc = (Get-Date).ToUniversalTime()
    $fromQueryIso = [System.Uri]::EscapeDataString($testStartUtc.AddSeconds(-5).ToString("yyyy-MM-ddTHH:mm:ssZ"))

    # Step 5: Generate normal traffic
    Write-Host "`n[5/8] Generating benign test traffic to trigger rules..." -ForegroundColor Yellow

    # (a) DNS volume: 30 Resolve-DnsName queries with unique subdomains
    Write-Host "  -> Generating 30 rapid DNS queries (testing suspicious_dns volume threshold)..." -ForegroundColor Gray
    1..30 | ForEach-Object {
        $sub = "nst-$([guid]::NewGuid().ToString().Substring(0, 8)).example.com"
        try {
            Resolve-DnsName -Name $sub -Type A -DnsOnly -QuickTimeout -ErrorAction SilentlyContinue | Out-Null
        } catch {}
        Start-Sleep -Milliseconds 40
    }

    # (b) DNS long names: 4 lookups with first label of 55 random characters (> 60 total characters)
    Write-Host "  -> Generating 4 long DNS queries (testing suspicious_dns anomaly threshold)..." -ForegroundColor Gray
    1..4 | ForEach-Object {
        $chars = -join ((1..55) | ForEach-Object { [char](Get-Random -Minimum 97 -Maximum 123) })
        $longDomain = "$chars.example.com"
        try {
            Resolve-DnsName -Name $longDomain -Type A -DnsOnly -QuickTimeout -ErrorAction SilentlyContinue | Out-Null
        } catch {}
        Start-Sleep -Milliseconds 60
    }

    # (c) Plain HTTP payload: SQL injection & XSS in query parameters
    Write-Host "  -> Sending HTTP requests with attack signatures (testing suspicious_payload)..." -ForegroundColor Gray
    try {
        Invoke-WebRequest -Uri "http://example.com/?id=1' OR 1=1 --" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue | Out-Null
    } catch {}
    try {
        Invoke-WebRequest -Uri "http://example.com/?q=<script>alert(1)</script>" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue | Out-Null
    } catch {}

    # (d) ICMP: 12 echo requests
    Write-Host "  -> Sending 12 ICMP echo requests (testing icmp_flood threshold 5/10s)..." -ForegroundColor Gray
    try {
        ping.exe 8.8.8.8 -n 12 | Out-Null
    } catch {}

    # (e) Optional WaitForScan
    if ($WaitForScan) {
        Write-Host "`n============================================================" -ForegroundColor Magenta
        Write-Host "WAITING FOR EXTERNAL PORT SCAN & SYN FLOOD" -ForegroundColor Magenta
        Write-Host "Host IPv4: $laptopIp" -ForegroundColor Cyan
        Write-Host "To trigger port_scan and syn_flood, run from another device on the same Wi-Fi:" -ForegroundColor White
        Write-Host "    nmap -p 1-100 $laptopIp" -ForegroundColor Yellow
        Write-Host "NetSentinel is polling for external port_scan alerts (up to 90s)..." -ForegroundColor Gray
        Write-Host "============================================================" -ForegroundColor Magenta

        $scanTimeout = 90
        $scanStopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $scanDetected = $false

        while ($scanStopwatch.Elapsed.TotalSeconds -lt $scanTimeout) {
            $elapsedSec = [int]$scanStopwatch.Elapsed.TotalSeconds
            $remSec = $scanTimeout - $elapsedSec
            Write-Host "  Waiting for external scan... ($remSec s remaining)" -ForegroundColor Gray

            try {
                $checkScanRes = Invoke-RestMethod -Uri "$baseUrl/api/alerts?alert_type=port_scan&from=$fromQueryIso" -Headers $headers
                if ($checkScanRes.total -gt 0 -or $checkScanRes.data.Count -gt 0) {
                    Write-Host "  [+] Port scan detected from external source!" -ForegroundColor Green
                    $scanDetected = $true
                    break
                }
            } catch {}

            Start-Sleep -Seconds 3
        }

        if (-not $scanDetected) {
            Write-Host "  [!] Timed out waiting for external port scan." -ForegroundColor Yellow
        }
    }

    # Step 6: Wait 5s for detection sliding windows and batch flushes, then stop capture
    Write-Host "`n[6/8] Flushing capture buffer and stopping capture session..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5

    try {
        $stopRes = Invoke-RestMethod -Uri "$baseUrl/api/capture/stop" -Method Post -Headers $headers
        $captureStarted = $false
        Write-Host "  Capture stopped successfully." -ForegroundColor Green
    } catch {
        Write-Host "  Error stopping capture: $_" -ForegroundColor Yellow
    }

    Start-Sleep -Seconds 2

    # Step 7: Evaluate assertions
    Write-Host "`n[7/8] Evaluating live detection alerts and captured traffic..." -ForegroundColor Yellow

    $alertsRes = Invoke-RestMethod -Uri "$baseUrl/api/alerts?limit=100&from=$fromQueryIso" -Headers $headers
    $alerts = @($alertsRes.data)

    # In case of minor timestamp offset, also check newest alerts
    if ($alerts.Count -eq 0) {
        $allAlertsRes = Invoke-RestMethod -Uri "$baseUrl/api/alerts?limit=50" -Headers $headers
        $alerts = @($allAlertsRes.data | Where-Object {
            $aTime = [DateTime]::Parse($_.timestamp).ToUniversalTime()
            $aTime -ge $testStartUtc.AddSeconds(-10)
        })
    }

    # Query traffic to verify laptop IP appears in captured packets
    $trafficRes = Invoke-RestMethod -Uri "$baseUrl/api/traffic?limit=100&from=$fromQueryIso" -Headers $headers
    $trafficRows = @($trafficRes.data)
    if ($trafficRows.Count -eq 0) {
        $allTraffic = Invoke-RestMethod -Uri "$baseUrl/api/traffic?limit=100" -Headers $headers
        $trafficRows = @($allTraffic.data | Where-Object {
            $pTime = [DateTime]::Parse($_.timestamp).ToUniversalTime()
            $pTime -ge $testStartUtc.AddSeconds(-10)
        })
    }

    Write-Host "`nCaptured Alerts from this run ($($alerts.Count) total):" -ForegroundColor Cyan
    foreach ($a in $alerts) {
        Write-Host ("  - Alert #{0,-4} [{1,-8}] {2,-18} | Src: {3,-15} -> Dst: {4,-15} | {5}" -f `
            $a.id, $a.severity.ToUpper(), $a.alert_type, $a.source_ip, $a.destination_ip, $a.description) -ForegroundColor White
    }

    Write-Host "`n============================================================" -ForegroundColor Cyan
    Write-Host "LIVE DETECTION ASSERTIONS" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan

    # Assertion 1: suspicious_dns
    $dnsAlerts = @($alerts | Where-Object { $_.alert_type -eq "suspicious_dns" })
    $resDns = if ($dnsAlerts.Count -gt 0) { "PASS" } else { "FAIL" }
    if ($resDns -eq "PASS") {
        Write-Host "[PASS] Suspicious DNS: $($dnsAlerts.Count) alert(s) triggered" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Suspicious DNS: 0 alerts triggered (expected >= 1)" -ForegroundColor Red
        $allPass = $false
    }

    # Assertion 2: suspicious_payload
    $payloadAlerts = @($alerts | Where-Object { $_.alert_type -eq "suspicious_payload" })
    $resPayload = if ($payloadAlerts.Count -gt 0) { "PASS" } else { "FAIL" }
    if ($resPayload -eq "PASS") {
        Write-Host "[PASS] Suspicious Payload: $($payloadAlerts.Count) alert(s) triggered" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Suspicious Payload: 0 alerts triggered (expected >= 1)" -ForegroundColor Red
        $allPass = $false
    }

    # Assertion 3: icmp_flood
    $icmpAlerts = @($alerts | Where-Object { $_.alert_type -eq "icmp_flood" })
    $resIcmp = if ($icmpAlerts.Count -gt 0) { "PASS" } else { "FAIL" }
    if ($resIcmp -eq "PASS") {
        Write-Host "[PASS] ICMP Flood: $($icmpAlerts.Count) alert(s) triggered" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] ICMP Flood: 0 alerts triggered (expected >= 1)" -ForegroundColor Red
        $allPass = $false
    }

    # Assertion 4: real packet with laptop IP as src_ip
    $laptopPackets = @($trafficRows | Where-Object { $_.src_ip -eq $laptopIp })
    $resHostTraffic = if ($laptopPackets.Count -gt 0) { "PASS" } else { "FAIL" }
    if ($resHostTraffic -eq "PASS") {
        Write-Host "[PASS] Host IP Traffic: Laptop IP $laptopIp appeared as src_ip in $($laptopPackets.Count) packet(s)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Host IP Traffic: Laptop IP $laptopIp not found as src_ip in recent traffic" -ForegroundColor Red
        $allPass = $false
    }

    # Optional assertions if -WaitForScan
    $resPortScan = "SKIPPED"
    $resSynFlood = "SKIPPED"
    if ($WaitForScan) {
        $scanAlerts = @($alerts | Where-Object { $_.alert_type -eq "port_scan" })
        $resPortScan = if ($scanAlerts.Count -gt 0) { "PASS" } else { "FAIL" }
        if ($resPortScan -eq "PASS") {
            Write-Host "[PASS] Port Scan: $($scanAlerts.Count) alert(s) triggered" -ForegroundColor Green
        } else {
            Write-Host "[FAIL] Port Scan: 0 alerts triggered (expected >= 1)" -ForegroundColor Red
            $allPass = $false
        }

        $synAlerts = @($alerts | Where-Object { $_.alert_type -eq "syn_flood" })
        $resSynFlood = if ($synAlerts.Count -gt 0) { "PASS" } else { "FAIL" }
        if ($resSynFlood -eq "PASS") {
            Write-Host "[PASS] SYN Flood: $($synAlerts.Count) alert(s) triggered" -ForegroundColor Green
        } else {
            Write-Host "[FAIL] SYN Flood: 0 alerts triggered (expected >= 1)" -ForegroundColor Red
            $allPass = $false
        }
    }

    # Step 8: Print REAL DETECTION SUMMARY table
    Write-Host "`n============================================================" -ForegroundColor Cyan
    Write-Host "REAL DETECTION SUMMARY" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan

    $summaryTable = @(
        [PSCustomObject]@{
            "rule"         = "suspicious_dns"
            "triggered by" = "30 rapid DNS queries + long subdomain"
            "result"       = $resDns
        },
        [PSCustomObject]@{
            "rule"         = "suspicious_payload"
            "triggered by" = "HTTP GET with SQLi / XSS payload"
            "result"       = $resPayload
        },
        [PSCustomObject]@{
            "rule"         = "icmp_flood"
            "triggered by" = "12 ICMP echo requests (threshold 5/10s)"
            "result"       = $resIcmp
        },
        [PSCustomObject]@{
            "rule"         = "host_ip_traffic"
            "triggered by" = "Laptop IPv4 ($laptopIp) captured"
            "result"       = $resHostTraffic
        },
        [PSCustomObject]@{
            "rule"         = "port_scan"
            "triggered by" = if ($WaitForScan) { "External Nmap scan (ports 1-100)" } else { "External Nmap scan (use -WaitForScan)" }
            "result"       = $resPortScan
        },
        [PSCustomObject]@{
            "rule"         = "syn_flood"
            "triggered by" = if ($WaitForScan) { "External SYN packets > threshold" } else { "External SYN packets (use -WaitForScan)" }
            "result"       = $resSynFlood
        }
    )

    $summaryTable | Format-Table -AutoSize | Out-String | Write-Host

} finally {
    # STOP CAPTURE IF ACTIVE
    if ($captureStarted) {
        Write-Host "`nStopping live capture..." -ForegroundColor Yellow
        try {
            Invoke-RestMethod -Uri "$baseUrl/api/capture/stop" -Method Post -Headers $headers | Out-Null
        } catch {}
    }

    # RESTORE RULES FROM BACKUP
    if (Test-Path $backupPath) {
        Write-Host "`nRestoring original detection rules from $backupPath..." -ForegroundColor Yellow
        try {
            $backupContent = Get-Content $backupPath -Raw | ConvertFrom-Json
            foreach ($r in $backupContent) {
                $restoreBody = @{
                    threshold_value = [double]$r.threshold_value
                    time_window     = [int]$r.time_window
                    severity        = $r.severity
                    description     = $r.description
                } | ConvertTo-Json

                Invoke-RestMethod -Uri "$baseUrl/api/rules/$($r.id)" -Method Put -Body $restoreBody -ContentType "application/json" -Headers $headers | Out-Null

                # Check if is_active needs toggling back
                $currRule = Invoke-RestMethod -Uri "$baseUrl/api/rules" -Headers $headers | Where-Object { $_.id -eq $r.id }
                if ($currRule -and $currRule.is_active -ne $r.is_active) {
                    Invoke-RestMethod -Uri "$baseUrl/api/rules/$($r.id)/toggle" -Method Patch -Headers $headers | Out-Null
                }
            }
            Remove-Item $backupPath -Force -ErrorAction SilentlyContinue
            Write-Host "Rules restored" -ForegroundColor Green
        } catch {
            Write-Host "Error restoring rules: $_" -ForegroundColor Red
        }
    }
}

Write-Host "`n============================================================" -ForegroundColor Cyan
if ($allPass) {
    Write-Host "REAL DETECTION RESULT: ALL TESTS PASSED" -ForegroundColor Green
    exit 0
} else {
    Write-Host "REAL DETECTION RESULT: ONE OR MORE TESTS FAILED" -ForegroundColor Red
    exit 1
}
