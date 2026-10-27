# ==============================================================================
# NetSentinel End-to-End System Verification Script
# ==============================================================================
# Validates the entire NetSentinel MVP stack:
# - API health and MySQL database connection
# - Admin authentication
# - Simulator capture and attack generator activation
# - Real-time traffic ingestion and aggregation
# - Multi-rule threat detection engine
# - Automated device discovery and risk assessment
# - PDF & CSV report generation and file download
# - Role-Based Access Control (RBAC) security enforcement
# - Capture service shutdown
# ==============================================================================

[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"

# Locate workspace root and .env file
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$envFile = Join-Path $rootDir "backend\.env"

if (-not (Test-Path $envFile)) {
    Write-Host "[FAIL] Cannot locate backend\.env at $envFile" -ForegroundColor Red
    exit 1
}

# Parse backend/.env
$envVars = @{}
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
        $parts = $line.Split("=", 2)
        $envVars[$parts[0].Trim()] = $parts[1].Trim()
    }
}

$port = if ($envVars["PORT"]) { $envVars["PORT"] } else { "5000" }
$adminEmail = if ($envVars["ADMIN_EMAIL"]) { $envVars["ADMIN_EMAIL"] } else { "admin@netsentinel.local" }
$adminPassword = if ($envVars["ADMIN_PASSWORD"]) { $envVars["ADMIN_PASSWORD"] } else { "Admin@12345" }
$baseUrl = "http://localhost:$port/api"

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "   NetSentinel MVP End-to-End Verification Suite       " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "Target API:      $baseUrl" -ForegroundColor Gray
Write-Host "Admin Account:   $adminEmail" -ForegroundColor Gray
Write-Host "Timestamp:       $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Gray
Write-Host "-------------------------------------------------------`n" -ForegroundColor Gray

$passedSteps = 0
$totalSteps = 10
$stepResults = @()

function Record-Result {
    param (
        [string]$StepId,
        [string]$Name,
        [bool]$Success,
        [string]$Details
    )
    if ($Success) {
        $script:passedSteps++
        Write-Host "[$StepId] PASS: $Name" -ForegroundColor Green
        if ($Details) { Write-Host "       $Details" -ForegroundColor Gray }
        $script:stepResults += [PSCustomObject]@{ Step = $StepId; Name = $Name; Status = "PASS"; Details = $Details }
    } else {
        Write-Host "[$StepId] FAIL: $Name" -ForegroundColor Red
        if ($Details) { Write-Host "       Error: $Details" -ForegroundColor Red }
        $script:stepResults += [PSCustomObject]@{ Step = $StepId; Name = $Name; Status = "FAIL"; Details = $Details }
    }
}

# ------------------------------------------------------------------------------
# (a) Check GET /api/health and require db "connected"
# ------------------------------------------------------------------------------
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get -TimeoutSec 10
    if ($health.status -eq "ok" -and $health.db -eq "connected") {
        Record-Result "Step (a)" "API & MySQL Database Health Check" $true "Status: $($health.status), DB: $($health.db), Server Time: $($health.time)"
    } else {
        Record-Result "Step (a)" "API & MySQL Database Health Check" $false "Unexpected response: status=$($health.status), db=$($health.db)"
    }
} catch {
    Record-Result "Step (a)" "API & MySQL Database Health Check" $false $_.Exception.Message
}

# ------------------------------------------------------------------------------
# (b) Log in as Administrator
# ------------------------------------------------------------------------------
$adminToken = $null
$adminHeaders = @{}
try {
    $loginBody = @{
        email    = $adminEmail
        password = $adminPassword
    } | ConvertTo-Json

    $loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginBody -TimeoutSec 10
    if ($loginRes.token -and $loginRes.user.role -eq "admin") {
        $adminToken = $loginRes.token
        $adminHeaders = @{ Authorization = "Bearer $adminToken" }
        Record-Result "Step (b)" "Administrator Authentication" $true "User: $($loginRes.user.name) ($($loginRes.user.email)), Role: $($loginRes.user.role)"
    } else {
        Record-Result "Step (b)" "Administrator Authentication" $false "Token missing or role is not admin."
    }
} catch {
    Record-Result "Step (b)" "Administrator Authentication" $false $_.Exception.Message
}

# ------------------------------------------------------------------------------
# (c) Start Capture in Simulator Mode with Attacks Enabled
# ------------------------------------------------------------------------------
try {
    $startBody = @{
        mode             = "simulator"
        simulate_attacks = $true
    } | ConvertTo-Json

    $startRes = Invoke-RestMethod -Uri "$baseUrl/capture/start" -Method Post -Headers $adminHeaders -ContentType "application/json" -Body $startBody -TimeoutSec 10
    if ($startRes.settings.is_running -eq 1 -or $startRes.settings.is_running -eq $true) {
        Record-Result "Step (c)" "Start Capture (Simulator + Attacks)" $true "Mode: $($startRes.settings.mode), Running: $($startRes.settings.is_running), Attacks: $($startRes.settings.simulate_attacks)"
    } else {
        Record-Result "Step (c)" "Start Capture (Simulator + Attacks)" $false "Settings did not reflect running state."
    }
} catch {
    Record-Result "Step (c)" "Start Capture (Simulator + Attacks)" $false $_.Exception.Message
}

# ------------------------------------------------------------------------------
# (d) Wait 70 Seconds for Simulator Ingestion & Rule Triggers
# ------------------------------------------------------------------------------
Write-Host "`n[Step (d)] Waiting 70 seconds for packet capture and attack simulation..." -ForegroundColor Yellow
$waitTime = 70
for ($i = 1; $i -le $waitTime; $i++) {
    Write-Progress -Activity "Capturing Packets & Generating Security Alerts" -Status "Progress: $i of $waitTime seconds" -PercentComplete (($i / $waitTime) * 100)
    Start-Sleep -Seconds 1
}
Write-Progress -Activity "Capturing Packets & Generating Security Alerts" -Completed
Record-Result "Step (d)" "Capture Ingestion Window (70s)" $true "Elapsed 70s simulation window."

# ------------------------------------------------------------------------------
# (e) Assert GET /api/traffic?limit=1 Returns Total > 0
# ------------------------------------------------------------------------------
try {
    $trafficRes = Invoke-RestMethod -Uri "$baseUrl/traffic?limit=1" -Method Get -Headers $adminHeaders -TimeoutSec 10
    $totalPackets = $trafficRes.total
    if ($totalPackets -and [int64]$totalPackets -gt 0) {
        Record-Result "Step (e)" "Traffic Ingestion Verification" $true "Total packets recorded in MySQL: $totalPackets"
    } else {
        Record-Result "Step (e)" "Traffic Ingestion Verification" $false "Total packets returned: $totalPackets (expected > 0)"
    }
} catch {
    Record-Result "Step (e)" "Traffic Ingestion Verification" $false $_.Exception.Message
}

# ------------------------------------------------------------------------------
# (f) Assert GET /api/alerts/summary Shows at Least 3 Different Alert Types
# ------------------------------------------------------------------------------
try {
    $alertsSummary = Invoke-RestMethod -Uri "$baseUrl/alerts/summary" -Method Get -Headers $adminHeaders -TimeoutSec 10
    $byType = $alertsSummary.by_type
    $activeTypes = @()
    if ($byType) {
        foreach ($item in $byType) {
            if ($item.count -gt 0) {
                $activeTypes += "$($item.alert_type) ($($item.count))"
            }
        }
    }
    if ($activeTypes.Count -ge 3) {
        Record-Result "Step (f)" "Multi-Rule Intrusion Detection Verification" $true "Found $($activeTypes.Count) distinct alert types: $($activeTypes -join ', ')"
    } else {
        Record-Result "Step (f)" "Multi-Rule Intrusion Detection Verification" $false "Found only $($activeTypes.Count) alert types (expected >= 3): $($activeTypes -join ', ')"
    }
} catch {
    Record-Result "Step (f)" "Multi-Rule Intrusion Detection Verification" $false $_.Exception.Message
}

# ------------------------------------------------------------------------------
# (g) Assert GET /api/devices Returns at Least 5 Devices
# ------------------------------------------------------------------------------
try {
    $devicesRes = Invoke-RestMethod -Uri "$baseUrl/devices" -Method Get -Headers $adminHeaders -TimeoutSec 10
    $deviceCount = if ($devicesRes) { $devicesRes.Count } else { 0 }
    if ($deviceCount -ge 5) {
        Record-Result "Step (g)" "Device Discovery & Topology Verification" $true "Discovered $deviceCount active devices in network inventory (expected >= 5)"
    } else {
        Record-Result "Step (g)" "Device Discovery & Topology Verification" $false "Discovered only $deviceCount devices (expected >= 5)"
    }
} catch {
    Record-Result "Step (g)" "Device Discovery & Topology Verification" $false $_.Exception.Message
}

# ------------------------------------------------------------------------------
# (h) Generate One PDF and One CSV Report and Download Both
# ------------------------------------------------------------------------------
$reportsSuccess = $false
try {
    $startTimeIso = (Get-Date).AddHours(-1).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $endTimeIso = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

    # 1. Generate PDF Report
    $pdfBody = @{
        report_type = "traffic"
        format      = "pdf"
        start_time  = $startTimeIso
        end_time    = $endTimeIso
    } | ConvertTo-Json

    $pdfReport = Invoke-RestMethod -Uri "$baseUrl/reports" -Method Post -Headers $adminHeaders -ContentType "application/json" -Body $pdfBody -TimeoutSec 15
    $pdfId = $pdfReport.id

    # Download PDF
    $tmpPdfPath = Join-Path $env:TEMP "e2e_report_$pdfId.pdf"
    Invoke-WebRequest -Uri "$baseUrl/reports/$pdfId/download" -Headers $adminHeaders -OutFile $tmpPdfPath -TimeoutSec 15
    $pdfBytes = (Get-Item $tmpPdfPath).Length

    # 2. Generate CSV Report
    $csvBody = @{
        report_type = "alerts"
        format      = "csv"
        start_time  = $startTimeIso
        end_time    = $endTimeIso
    } | ConvertTo-Json

    $csvReport = Invoke-RestMethod -Uri "$baseUrl/reports" -Method Post -Headers $adminHeaders -ContentType "application/json" -Body $csvBody -TimeoutSec 15
    $csvId = $csvReport.id

    # Download CSV
    $tmpCsvPath = Join-Path $env:TEMP "e2e_report_$csvId.csv"
    Invoke-WebRequest -Uri "$baseUrl/reports/$csvId/download" -Headers $adminHeaders -OutFile $tmpCsvPath -TimeoutSec 15
    $csvBytes = (Get-Item $tmpCsvPath).Length

    # Cleanup temporary download files
    if (Test-Path $tmpPdfPath) { Remove-Item $tmpPdfPath -Force }
    if (Test-Path $tmpCsvPath) { Remove-Item $tmpCsvPath -Force }

    if ($pdfBytes -gt 1000 -and $csvBytes -gt 100) {
        Record-Result "Step (h)" "Report Generation & Download (PDF + CSV)" $true "PDF ID $pdfId ($pdfBytes bytes), CSV ID $csvId ($csvBytes bytes)"
    } else {
        Record-Result "Step (h)" "Report Generation & Download (PDF + CSV)" $false "Downloaded files too small or empty (PDF: $pdfBytes, CSV: $csvBytes)"
    }
} catch {
    Record-Result "Step (h)" "Report Generation & Download (PDF + CSV)" $false $_.Exception.Message
}

# ------------------------------------------------------------------------------
# (i) Register Normal User, Log In, and Assert POST /api/capture/stop Returns 403
# ------------------------------------------------------------------------------
try {
    $randomSuffix = Get-Random -Minimum 100000 -Maximum 999999
    $normalEmail = "e2e_tester_$randomSuffix@netsentinel.local"
    $normalPassword = "NormalUser@123"

    $regBody = @{
        name     = "E2E Regular Analyst"
        email    = $normalEmail
        password = $normalPassword
    } | ConvertTo-Json

    $regRes = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -ContentType "application/json" -Body $regBody -TimeoutSec 10

    # Log in as the newly registered normal user
    $loginUserBody = @{
        email    = $normalEmail
        password = $normalPassword
    } | ConvertTo-Json

    $loginUserRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginUserBody -TimeoutSec 10
    $userToken = $loginUserRes.token
    $userHeaders = @{ Authorization = "Bearer $userToken" }

    $stoppedUnexpectedly = $false
    try {
        $stopAttempt = Invoke-RestMethod -Uri "$baseUrl/capture/stop" -Method Post -Headers $userHeaders -ContentType "application/json" -TimeoutSec 10
        $stoppedUnexpectedly = $true
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 403) {
            Record-Result "Step (i)" "RBAC Enforcement (Normal User Cannot Stop Capture)" $true "Denied with HTTP 403 Forbidden as expected"
        } else {
            Record-Result "Step (i)" "RBAC Enforcement (Normal User Cannot Stop Capture)" $false "Expected HTTP 403 but got $statusCode"
        }
    }

    if ($stoppedUnexpectedly) {
        Record-Result "Step (i)" "RBAC Enforcement (Normal User Cannot Stop Capture)" $false "Normal user was able to stop capture (403 expected)"
    }
} catch {
    Record-Result "Step (i)" "RBAC Enforcement (Normal User Cannot Stop Capture)" $false $_.Exception.Message
}

# ------------------------------------------------------------------------------
# (j) Stop Capture as Administrator
# ------------------------------------------------------------------------------
try {
    $adminStopRes = Invoke-RestMethod -Uri "$baseUrl/capture/stop" -Method Post -Headers $adminHeaders -ContentType "application/json" -TimeoutSec 10
    if ($adminStopRes.settings.is_running -eq 0 -or $adminStopRes.settings.is_running -eq $false) {
        Record-Result "Step (j)" "Stop Capture as Administrator" $true "Capture stopped successfully. Running: $($adminStopRes.settings.is_running)"
    } else {
        Record-Result "Step (j)" "Stop Capture as Administrator" $false "Settings still report is_running=$($adminStopRes.settings.is_running)"
    }
} catch {
    Record-Result "Step (j)" "Stop Capture as Administrator" $false $_.Exception.Message
}

# ------------------------------------------------------------------------------
# Final Summary
# ------------------------------------------------------------------------------
Write-Host "`n-------------------------------------------------------" -ForegroundColor Gray
Write-Host "                TEST EXECUTION SUMMARY                 " -ForegroundColor Gray
Write-Host "-------------------------------------------------------" -ForegroundColor Gray
Write-Host "Total Steps:   $totalSteps" -ForegroundColor Gray
Write-Host "Passed Steps:  $passedSteps" -ForegroundColor $(if ($passedSteps -eq $totalSteps) { "Green" } else { "Yellow" })
Write-Host "Failed Steps:  $($totalSteps - $passedSteps)" -ForegroundColor $(if ($passedSteps -eq $totalSteps) { "Green" } else { "Red" })

if ($passedSteps -eq $totalSteps) {
    Write-Host "`n>>> ALL END-TO-END VERIFICATION CHECKS PASSED SUCCESSFULLY! <<<`n" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n>>> SOME VERIFICATION CHECKS FAILED. REVIEW LOGS ABOVE. <<<`n" -ForegroundColor Red
    exit 1
}
