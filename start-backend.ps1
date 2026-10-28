# SmartRoute — Start Backend
Write-Host "🚑 Starting SmartRoute Backend on http://localhost:8000" -ForegroundColor Cyan
Set-Location $PSScriptRoot\smartroute-backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
