$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw 'Node.js と npm が必要です。README.md の起動手順を確認してください。'
}
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules'))) {
    throw '初回はこのフォルダで npm ci を実行してください。'
}
Write-Output 'MARS BUILDER: http://127.0.0.1:5178/'
npm run dev
exit $LASTEXITCODE
