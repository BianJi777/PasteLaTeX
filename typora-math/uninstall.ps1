param(
  [string]$UserData = "$env:APPDATA\Typora"
)
$ErrorActionPreference = 'Stop'
$pluginsRoot = Join-Path $UserData 'plugins'
$pluginDir = Join-Path $pluginsRoot 'plugins\typora-math'
$pj = Join-Path $pluginsRoot 'settings\plugins.json'

if (Test-Path $pluginDir) { Remove-Item $pluginDir -Recurse -Force; Write-Output "removed $pluginDir" }
if (Test-Path $pj) {
  $obj = Get-Content $pj -Raw | ConvertFrom-Json
  $obj.PSObject.Properties.Remove('typora-math')
  $obj | ConvertTo-Json | Set-Content $pj -Encoding UTF8
  Write-Output "disabled in $pj"
}
Write-Output 'restart Typora.'
