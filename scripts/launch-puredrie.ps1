param(
  [switch]$Monitor,
  [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$siteUrl = "http://127.0.0.1:3000"
$healthUrl = "$siteUrl/api/health"
$stateRoot = Join-Path $env:LOCALAPPDATA "Puredrie Foods"
$logRoot = Join-Path $stateRoot "logs"
$launcherLog = Join-Path $logRoot "launcher.log"
$serverOutput = Join-Path $logRoot "server-output.log"
$serverError = Join-Path $logRoot "server-error.log"
$monitorMutex = $null
$serverProcess = $null

New-Item -ItemType Directory -Force -Path $logRoot | Out-Null

function Write-LauncherLog {
  param([string]$Message)
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
  Add-Content -Path $launcherLog -Value $line
}

function Test-Healthy {
  try {
    $response = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 4
    return $response.status -eq "ok" -and $response.database -eq "connected"
  } catch {
    return $false
  }
}

function Test-PortInUse {
  $connection = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1
  return $null -ne $connection
}

function Start-LocalServer {
  if (Test-PortInUse) {
    Write-LauncherLog "Port 3000 is already in use by another process; leaving it untouched."
    return $null
  }

  $nextCli = Join-Path $projectRoot "node_modules\next\dist\bin\next"
  if (-not (Test-Path $nextCli)) {
    throw "Next.js is not installed. Run npm.cmd install in $projectRoot."
  }
  if (-not (Test-Path (Join-Path $projectRoot ".next\BUILD_ID"))) {
    throw "The production build is missing. Run npm.cmd run build before launching Puredrie."
  }

  $node = (Get-Command node.exe -ErrorAction Stop).Source
  $process = Start-Process -FilePath $node `
    -ArgumentList @("`"$nextCli`"", "start", "--hostname", "127.0.0.1", "--port", "3000") `
    -WorkingDirectory $projectRoot `
    -RedirectStandardOutput $serverOutput `
    -RedirectStandardError $serverError `
    -WindowStyle Hidden `
    -PassThru
  Write-LauncherLog "Started production server (PID $($process.Id))."
  return $process
}

function Ensure-DatabaseService {
  $database = Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
  if ($null -eq $database) {
    Write-LauncherLog "PostgreSQL service postgresql-x64-18 was not found."
    return
  }
  if ($database.Status -ne "Running") {
    try {
      Start-Service -Name $database.Name
      Write-LauncherLog "Started PostgreSQL service."
    } catch {
      Write-LauncherLog "Could not start PostgreSQL service: $($_.Exception.Message)"
    }
  }
}

if ($Monitor) {
  $monitorMutex = New-Object System.Threading.Mutex($false, "Local\PuredrieFoodsLocalMonitor")
  if (-not $monitorMutex.WaitOne(0)) {
    exit 0
  }

  Set-Location $projectRoot
  Write-LauncherLog "Puredrie local monitor started."
  $lastHealthy = $false
  $lastStartError = ""
  $lastStartErrorAt = [DateTime]::MinValue
  try {
    while ($true) {
      Ensure-DatabaseService
      if ($null -ne $serverProcess -and $serverProcess.HasExited) {
        Write-LauncherLog "Local server exited with code $($serverProcess.ExitCode); restarting."
        $serverProcess = $null
      }

      if ($null -eq $serverProcess) {
        try {
          $serverProcess = Start-LocalServer
        } catch {
          $startError = $_.Exception.Message
          if ($startError -ne $lastStartError -or (Get-Date) - $lastStartErrorAt -gt [TimeSpan]::FromMinutes(1)) {
            Write-LauncherLog "Could not start the local server: $startError"
            $lastStartError = $startError
            $lastStartErrorAt = Get-Date
          }
        }
      }

      $healthy = Test-Healthy
      if ($healthy -and -not $lastHealthy) {
        Write-LauncherLog "Local website and database are healthy."
      } elseif (-not $healthy -and $lastHealthy) {
        Write-LauncherLog "Local website or database became unavailable; monitoring for recovery."
      }
      $lastHealthy = $healthy
      Start-Sleep -Seconds 10
    }
  } finally {
    if ($null -ne $monitorMutex) {
      $monitorMutex.ReleaseMutex()
      $monitorMutex.Dispose()
    }
  }
}

if ($OpenBrowser) {
  $powershell = (Get-Command powershell.exe -ErrorAction Stop).Source
  Start-Process -FilePath $powershell `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", "`"$PSCommandPath`"", "-Monitor") `
    -WorkingDirectory $projectRoot `
    -WindowStyle Hidden

  $deadline = (Get-Date).AddMinutes(3)
  while ((Get-Date) -lt $deadline) {
    if (Test-Healthy) {
      Start-Process $siteUrl
      exit 0
    }
    Start-Sleep -Seconds 3
  }

  Write-LauncherLog "The app did not become healthy within three minutes; see server and launcher logs."
  Start-Process "notepad.exe" -ArgumentList "`"$launcherLog`""
  exit 1
}
