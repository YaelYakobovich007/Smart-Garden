#!/bin/bash

# Smart Garden - Cloud Run Deployment Script
set -e

echo "🌱 Deploying Smart Garden Backend to Cloud Run..."

# Get project ID
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ No project set. Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "📋 Project: $PROJECT_ID"

# Build and deploy in one command
echo "🚀 Building and deploying..."
gcloud run deploy smart-garden-backend \
  --source . \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 3600

# Get service URL
SERVICE_URL=$(gcloud run services describe smart-garden-backend --region=europe-west1 --format="value(status.url)")

echo ""
echo "✅ Deployment successful!"
echo "🌐 Your service URL: $SERVICE_URL"
echo "🔗 WebSocket URL: ${SERVICE_URL/https:/wss:}"
echo ""
echo "📝 Next steps:"
echo "1. Set environment variables in Cloud Run console"
echo "2. Update mobile app with new WebSocket URL"
echo "3. Update Raspberry Pi configuration"
