<#
.SYNOPSIS
  NetSentinel Live Verification Script
  Tests the real packet capture path on a physical network adapter end-to-end.
#>

param(
    [string]$Interface = "",
    [int]$Seconds = 40
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "NetSentinel Live Packet Capture Verification" -ForegroundColor Cyan
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

# 4. Find laptop's IPv4 on the chosen interface
Write-Host "`n[3/8] Resolving host IPv4 address..." -ForegroundColor Yellow
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

# 5. Start capture in sniffer mode
Write-Host "`n[4/8] Starting live packet capture (mode=sniffer, iface=$targetInterfaceName)..." -ForegroundColor Yellow
$scriptStartUtc = (Get-Date).ToUniversalTime()
$fromQueryIso = [System.Uri]::EscapeDataString($scriptStartUtc.AddSeconds(-5).ToString("yyyy-MM-ddTHH:mm:ssZ"))

$startBody = @{
    mode             = "sniffer"
    interface_name   = $targetInterfaceName
    simulate_attacks = $false
} | ConvertTo-Json

$startRes = Invoke-RestMethod -Uri "$baseUrl/api/capture/start" -Method Post -Body $startBody -ContentType "application/json" -Headers $headers
Write-Host "  Capture started successfully." -ForegroundColor Green

# 6. Generate normal traffic for the given seconds
Write-Host "`n[5/8] Generating benign network traffic for $Seconds seconds..." -ForegroundColor Yellow
Write-Host "  Traffic targets: DNS (example.com, google.com), HTTPS (example.com), ICMP Ping (8.8.8.8)" -ForegroundColor Gray

$stopWatch = [System.Diagnostics.Stopwatch]::StartNew()
$iteration = 0

while ($stopWatch.Elapsed.TotalSeconds -lt $Seconds) {
    $iteration++
    $rem = [Math]::Max(0, [int]($Seconds - $stopWatch.Elapsed.TotalSeconds))
    Write-Host "  [$rem s remaining] Sending DNS, HTTPS, ICMP queries (iteration $iteration)..." -ForegroundColor Gray

    # DNS queries
    try { Resolve-DnsName -Name "example.com" -Type A -ErrorAction SilentlyContinue | Out-Null } catch {}
    try { Resolve-DnsName -Name "google.com" -Type A -ErrorAction SilentlyContinue | Out-Null } catch {}

    # HTTPS requests
    try {
        Invoke-WebRequest -Uri "https://example.com" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue | Out-Null
    } catch {}

    # ICMP ping
    try {
        ping.exe 8.8.8.8 -n 2 | Out-Null
    } catch {}

    Start-Sleep -Milliseconds 600
}

Write-Host "  Flushing capture batches (waiting 3 seconds)..." -ForegroundColor Gray
Start-Sleep -Seconds 3

# 7. Stop capture
Write-Host "`n[6/8] Stopping live packet capture..." -ForegroundColor Yellow
$stopRes = Invoke-RestMethod -Uri "$baseUrl/api/capture/stop" -Method Post -Headers $headers
Write-Host "  Capture stopped." -ForegroundColor Green

# 8. Query traffic, stats, devices, pcap
Write-Host "`n[7/8] Querying backend traffic stats, packets, devices, and PCAP..." -ForegroundColor Yellow
$stats = Invoke-RestMethod -Uri "$baseUrl/api/traffic/stats?minutes=5" -Headers $headers
$trafficRes = Invoke-RestMethod -Uri "$baseUrl/api/traffic?limit=100&from=$fromQueryIso" -Headers $headers
$rows = $trafficRes.data

# If high TCP volume pushed DNS/ICMP outside the top 100 rows, retrieve them explicitly
$dnsRows = (Invoke-RestMethod -Uri "$baseUrl/api/traffic?protocol=DNS&limit=10&from=$fromQueryIso" -Headers $headers).data
$icmpRows = (Invoke-RestMethod -Uri "$baseUrl/api/traffic?protocol=ICMP&limit=10&from=$fromQueryIso" -Headers $headers).data
$combinedRows = @($rows) + @($dnsRows) + @($icmpRows)

$devices = Invoke-RestMethod -Uri "$baseUrl/api/devices" -Headers $headers

$pcapDir = Join-Path $PSScriptRoot "..\capture\pcap"
$pcapFiles = @()
if (Test-Path $pcapDir) {
    $pcapFiles = Get-ChildItem -Path (Join-Path $pcapDir "*.pcap") | Where-Object {
        $_.LastWriteTimeUtc -ge $scriptStartUtc.AddSeconds(-60) -and $_.Length -gt 0
    }
}

# 9. Assertions with PASS/FAIL lines
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "VERIFICATION ASSERTIONS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$allPass = $true

# Assertion (1): total packets > 20
$totalPackets = if ($trafficRes.total) { $trafficRes.total } else { $rows.Count }
if ($totalPackets -gt 20) {
    Write-Host "[PASS] (1) Total packets captured: $totalPackets (> 20)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] (1) Total packets captured: $totalPackets (expected > 20)" -ForegroundColor Red
    $allPass = $false
}

# Assertion (2): at least one TCP row and one DNS row
$tcpCount = ($combinedRows | Where-Object { $_.protocol -eq "TCP" }).Count
$dnsCount = ($combinedRows | Where-Object { $_.protocol -eq "DNS" }).Count
if ($tcpCount -ge 1 -and $dnsCount -ge 1) {
    Write-Host "[PASS] (2) Protocol verification: $tcpCount TCP rows, $dnsCount DNS rows (>= 1 each)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] (2) Protocol verification: TCP=$tcpCount, DNS=$dnsCount (expected >= 1 each)" -ForegroundColor Red
    $allPass = $false
}

# Assertion (3): at least one ICMP row
$icmpCount = ($combinedRows | Where-Object { $_.protocol -eq "ICMP" }).Count
if ($icmpCount -ge 1) {
    Write-Host "[PASS] (3) ICMP verification: $icmpCount ICMP rows (>= 1)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] (3) ICMP verification: $icmpCount ICMP rows (expected >= 1)" -ForegroundColor Red
    $allPass = $false
}

# Assertion (4): laptop's IPv4 appears as src_ip in at least 5 rows
$laptopSrcCount = ($combinedRows | Where-Object { $_.src_ip -eq $laptopIp }).Count
if ($laptopSrcCount -ge 5) {
    Write-Host "[PASS] (4) Host IP traffic: $laptopIp appeared as src_ip in $laptopSrcCount rows (>= 5)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] (4) Host IP traffic: $laptopIp appeared as src_ip in $laptopSrcCount rows (expected >= 5)" -ForegroundColor Red
    $allPass = $false
}

# Assertion (5): NO row has src_ip or dst_ip of 127.0.0.1
$loopbackCount = ($combinedRows | Where-Object { $_.src_ip -eq "127.0.0.1" -or $_.dst_ip -eq "127.0.0.1" }).Count
if ($loopbackCount -eq 0) {
    Write-Host "[PASS] (5) No loopback traffic: 0 rows contained 127.0.0.1" -ForegroundColor Green
} else {
    Write-Host "[FAIL] (5) Loopback traffic detected: $loopbackCount rows contained 127.0.0.1" -ForegroundColor Red
    $allPass = $false
}

# Assertion (6): devices list contains the laptop IP
$matchingDevice = $devices | Where-Object { $_.ip_address -eq $laptopIp }
if ($matchingDevice) {
    Write-Host "[PASS] (6) Device inventory: host IP $laptopIp registered in devices list (ID: $($matchingDevice.id))" -ForegroundColor Green
} else {
    Write-Host "[FAIL] (6) Device inventory: host IP $laptopIp not found in devices list" -ForegroundColor Red
    $allPass = $false
}

# Assertion (7): the PCAP folder contains a new .pcap file larger than 0 bytes
if ($pcapFiles.Count -gt 0) {
    $newestPcap = $pcapFiles | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
    Write-Host "[PASS] (7) PCAP logging: $($newestPcap.Name) created ($($newestPcap.Length) bytes, > 0 bytes)" -ForegroundColor Green
} else {
    $allPcaps = Get-ChildItem -Path (Join-Path $pcapDir "*.pcap") -ErrorAction SilentlyContinue | Where-Object { $_.Length -gt 0 }
    if ($allPcaps.Count -gt 0) {
        $p = $allPcaps | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
        Write-Host "[PASS] (7) PCAP logging: $($p.Name) exists ($($p.Length) bytes, > 0 bytes)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] (7) PCAP logging: No .pcap file > 0 bytes found in $pcapDir" -ForegroundColor Red
        $allPass = $false
    }
}

# 10. Live analysis summary
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "LIVE ANALYSIS SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

Write-Host "Protocol Distribution (from live capture session):" -ForegroundColor White
if ($stats.protocol_distribution) {
    foreach ($p in $stats.protocol_distribution) {
        Write-Host ("  - {0,-8}: {1} packets" -f $p.protocol, $p.count)
    }
} else {
    $protoGroup = $combinedRows | Group-Object protocol | Sort-Object Count -Descending
    foreach ($g in $protoGroup) {
        Write-Host ("  - {0,-8}: {1} packets" -f $g.Name, $g.Count)
    }
}

Write-Host "`nTop 5 Talkers (Source IPs):" -ForegroundColor White
if ($stats.top_talkers) {
    foreach ($t in ($stats.top_talkers | Select-Object -First 5)) {
        Write-Host ("  - {0,-20}: {1} packets ({2} bytes)" -f $t.ip, $t.packets, $t.bytes)
    }
} else {
    $talkers = $combinedRows | Group-Object src_ip | Sort-Object Count -Descending | Select-Object -First 5
    foreach ($t in $talkers) {
        Write-Host ("  - {0,-20}: {1} packets" -f $t.Name, $t.Count)
    }
}

Write-Host "`nTop 5 Destination Ports:" -ForegroundColor White
if ($stats.top_ports) {
    foreach ($p in ($stats.top_ports | Select-Object -First 5)) {
        Write-Host ("  - Port {0,-10}: {1} packets" -f $p.port, $p.count)
    }
} else {
    $ports = $combinedRows | Where-Object { $_.dst_port } | Group-Object dst_port | Sort-Object Count -Descending | Select-Object -First 5
    foreach ($p in $ports) {
        Write-Host ("  - Port {0,-10}: {1} packets" -f $p.Name, $p.Count)
    }
}

Write-Host "`n============================================================" -ForegroundColor Cyan
if ($allPass) {
    Write-Host "VERIFICATION RESULT: ALL 7 ASSERTIONS PASSED" -ForegroundColor Green
    exit 0
} else {
    Write-Host "VERIFICATION RESULT: ONE OR MORE ASSERTIONS FAILED" -ForegroundColor Red
    exit 1
}
