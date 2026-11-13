param(
  [string]$UserData = "$env:APPDATA\Typora"
)
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$pluginsRoot = Join-Path $UserData 'plugins'
$pluginDir = Join-Path $pluginsRoot 'plugins\pastetex'
$settings = Join-Path $pluginsRoot 'settings'

if (-not (Test-Path (Join-Path $here 'dist\main.js'))) { throw 'missing dist/main.js; run: node build-plugin.mjs' }

New-Item -ItemType Directory -Force -Path $pluginDir | Out-Null
Copy-Item (Join-Path $here 'dist\main.js')    (Join-Path $pluginDir 'main.js')    -Force
Copy-Item (Join-Path $here 'manifest.json')    (Join-Path $pluginDir 'manifest.json') -Force
Write-Output "plugin installed: $pluginDir"

New-Item -ItemType Directory -Force -Path $settings | Out-Null
$pj = Join-Path $settings 'plugins.json'
$obj = [pscustomobject]@{}
if (Test-Path $pj) { $obj = Get-Content $pj -Raw | ConvertFrom-Json }
$obj | Add-Member -Force -NotePropertyName 'pastetex' -NotePropertyValue $true
$obj | ConvertTo-Json | Set-Content $pj -Encoding UTF8
Write-Output "enabled in $pj"
Write-Output 'restart Typora to load.'
