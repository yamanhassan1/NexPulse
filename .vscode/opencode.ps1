$ErrorActionPreference = 'Continue'

$authPath = Join-Path $env:USERPROFILE '.local\share\opencode\auth.json'
$hasOpenRouter = (Test-Path -LiteralPath $authPath) -and ((Get-Content -LiteralPath $authPath -Raw) -match 'openrouter')

if (-not $hasOpenRouter -and -not $env:OPENROUTER_API_KEY) {
  Write-Host 'OpenRouter API key not found - starting login...' -ForegroundColor Yellow
  opencode auth login -p openrouter
}

if (Get-Command opencode -ErrorAction SilentlyContinue) {
  opencode
} else {
  Write-Error 'opencode CLI not found on PATH.'
}
