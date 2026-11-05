# Entry point for Windows Task Scheduler. Runs one pipeline script from the api
# folder and keeps a dated log under %LOCALAPPDATA%\ClearCaseIQ\logs.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File scheduled-pi-refresh.ps1 -Script refresh-ca-pi-attorneys
#   powershell -NoProfile -ExecutionPolicy Bypass -File scheduled-pi-refresh.ps1 -Script purge-places-cache
param(
  [Parameter(Mandatory = $true)][string]$Script
)

$api = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $env:LOCALAPPDATA 'ClearCaseIQ\logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir ("{0}-{1:yyyyMMdd-HHmm}.log" -f $Script, (Get-Date))

Set-Location $api
& node ..\node_modules\tsx\dist\cli.mjs "scripts\$Script.ts" *> $log
exit $LASTEXITCODE
