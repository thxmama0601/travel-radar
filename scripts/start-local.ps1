$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$address = 'http://localhost:5173/'
function Test-TravelRadar {
  try {
    $response = Invoke-WebRequest -Uri $address -UseBasicParsing -TimeoutSec 3
    return $response.StatusCode -eq 200 -and $response.Content.Contains('旅訊雷達')
  } catch { return $false }
}
if (-not (Test-TravelRadar)) {
  $runtimeDir = Join-Path $projectDir '.sites-runtime'
  New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
  $nodePath = (Get-Command node -ErrorAction Stop).Source
  $env:NODE_USE_SYSTEM_CA = '1'
  $server = Start-Process -FilePath $nodePath -ArgumentList @('scripts/run-framework.mjs','dev') -WorkingDirectory $projectDir -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDir 'local-server.log') -RedirectStandardError (Join-Path $runtimeDir 'local-server-error.log') -PassThru
  $server.Id | Set-Content (Join-Path $runtimeDir 'local-server.pid')
  $ready = $false
  for ($attempt=0; $attempt -lt 30; $attempt++) {
    if (Test-TravelRadar) { $ready=$true; break }
    if ($server.HasExited) { throw '服務啟動失敗，請查看 .sites-runtime/local-server-error.log。' }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw '服務仍在準備，請稍後重新執行啟動器。' }
}
Start-Process $address
