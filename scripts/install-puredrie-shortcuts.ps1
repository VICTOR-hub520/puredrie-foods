$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$launcher = Join-Path $PSScriptRoot "launch-puredrie.ps1"
$desktop = [Environment]::GetFolderPath("Desktop")
$startup = [Environment]::GetFolderPath("Startup")
$stateRoot = Join-Path $env:LOCALAPPDATA "Puredrie Foods"
$iconPath = Join-Path $stateRoot "puredrie.ico"
$powershell = (Get-Command powershell.exe -ErrorAction Stop).Source

if (-not (Test-Path (Join-Path $projectRoot ".next\BUILD_ID"))) {
  throw "Build the production app first with npm.cmd run build."
}

New-Item -ItemType Directory -Force -Path $stateRoot | Out-Null

Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap(64, 64)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::Transparent)
$forest = [System.Drawing.ColorTranslator]::FromHtml("#173D2B")
$mango = [System.Drawing.ColorTranslator]::FromHtml("#E99A32")
$cream = [System.Drawing.ColorTranslator]::FromHtml("#FAF7EF")
$backgroundBrush = New-Object System.Drawing.SolidBrush($forest)
$fruitBrush = New-Object System.Drawing.SolidBrush($mango)
$leafBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(225, 247, 239, 211))
$graphics.FillEllipse($backgroundBrush, 2, 2, 60, 60)
$graphics.FillEllipse($fruitBrush, 16, 23, 31, 26)
$graphics.FillEllipse($leafBrush, 30, 12, 16, 8)
$graphics.DrawString("pf", (New-Object System.Drawing.Font("Georgia", 10, [System.Drawing.FontStyle]::Bold)), (New-Object System.Drawing.SolidBrush($cream)), 24, 30)
$icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
$iconStream = [System.IO.File]::Create($iconPath)
$icon.Save($iconStream)
$iconStream.Dispose()
$icon.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
$backgroundBrush.Dispose()
$fruitBrush.Dispose()
$leafBrush.Dispose()

$shell = New-Object -ComObject WScript.Shell
function New-PuredrieShortcut {
  param(
    [string]$Path,
    [string]$Arguments,
    [string]$Description
  )
  $shortcut = $shell.CreateShortcut($Path)
  $shortcut.TargetPath = $powershell
  $shortcut.Arguments = $Arguments
  $shortcut.WorkingDirectory = $projectRoot
  $shortcut.IconLocation = "$iconPath,0"
  $shortcut.Description = $Description
  $shortcut.Save()
}

New-PuredrieShortcut `
  -Path (Join-Path $desktop "Puredrie Foods.local.lnk") `
  -Arguments "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcher`" -OpenBrowser" `
  -Description "Open the local Puredrie Foods website"

New-PuredrieShortcut `
  -Path (Join-Path $startup "Puredrie Foods Local Monitor.lnk") `
  -Arguments "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcher`" -Monitor" `
  -Description "Keep the local Puredrie Foods website available while signed in"

Write-Output "Created the Puredrie Foods desktop shortcut and sign-in startup monitor."
