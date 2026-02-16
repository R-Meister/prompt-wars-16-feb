#!/bin/bash

# Atlas Deployment Script
# Usage: ./deploy.sh [PROJECT_ID]

PROJECT_ID=${1:-"trans-shuttle-487605-u0"}

echo "🚀 Preparing deployment for project: $PROJECT_ID"

# 1. Set the project
gcloud config set project $PROJECT_ID

# 2. Check for .env and warn if missing
if [ ! -f .env ]; then
  echo "⚠️ Warning: .env file missing. Ensure secrets are configured in GCP Console."
fi

# 3. Deploy to App Engine
echo "📦 Deploying to Google App Engine..."
gcloud app deploy app.yaml --quiet

echo "✅ Deployment complete!"
gcloud app browse
