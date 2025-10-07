#!/bin/bash

# Frontend Redeploy Script
echo "🚀 Redeploying Crypto News Frontend"
echo "==================================="

# Add timestamp to trigger redeploy
echo "Force Vercel redeploy - $(date)" >> vercel-redeploy.txt

echo "📦 Building and deploying to Vercel..."

# Deploy to Vercel production
npx vercel --prod --confirm

if [ $? -eq 0 ]; then
    echo "✅ Frontend redeployed successfully!"
    echo "🌐 Your frontend should be live at: https://crypto-news-frontend.vercel.app"
else
    echo "❌ Deployment failed. Please check the error messages above."
fi

echo ""
echo "📊 You can check deployment status at:"
echo "   https://vercel.com/dashboard"