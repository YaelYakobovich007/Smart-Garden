# Smart Garden - Cloud Run Deployment Script (PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "🌱 Deploying Smart Garden Backend to Cloud Run..." -ForegroundColor Green

# Set gcloud path
$gcloudPath = "${env:LOCALAPPDATA}\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"

# Get project ID
$projectId = & $gcloudPath config get-value project
if (-not $projectId) {
    Write-Host "❌ No project set. Run: gcloud config set project YOUR_PROJECT_ID" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Project: $projectId" -ForegroundColor Cyan

# Build and deploy
Write-Host "🚀 Building and deploying..." -ForegroundColor Yellow
& $gcloudPath run deploy smart-garden-backend `
    --source . `
    --region europe-west1 `
    --platform managed `
    --allow-unauthenticated `
    --port 8080 `
    --memory 512Mi `
    --cpu 1 `
    --min-instances 0 `
    --max-instances 10 `
    --timeout 3600

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

# Get service URL
$serviceUrl = & $gcloudPath run services describe smart-garden-backend --region=europe-west1 --format="value(status.url)"

Write-Host ""
Write-Host "✅ Deployment successful!" -ForegroundColor Green
Write-Host "🌐 Your service URL: $serviceUrl" -ForegroundColor Cyan
Write-Host "🔗 WebSocket URL: $($serviceUrl -replace 'https:', 'wss:')" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "1. Set environment variables in Cloud Run console"
Write-Host "2. Update mobile app with new WebSocket URL"
Write-Host "3. Update Raspberry Pi configuration"
