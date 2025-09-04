#!/bin/bash
# Script to install frontend dependencies with permission fixes

echo "🚀 Installing CryptoCurator Frontend Dependencies..."

# Check if we can write to npm cache
if [ ! -w "/Users/valorkopeny/.npm" ]; then
    echo "❌ NPM cache permission issue detected"
    echo "Please run: sudo chown -R $(whoami) ~/.npm"
    echo "Or delete ~/.npm and try again: rm -rf ~/.npm"
    exit 1
fi

# Clean previous installation
echo "🧹 Cleaning previous installation..."
rm -rf node_modules package-lock.json

# Install with verbose logging
echo "📦 Installing dependencies..."
npm install --verbose

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
    echo "🎯 You can now run: npm start"
else
    echo "❌ Installation failed. Try:"
    echo "  1. Delete ~/.npm: rm -rf ~/.npm"
    echo "  2. Or fix permissions: sudo chown -R $(whoami) ~/.npm"
    echo "  3. Then run this script again"
    exit 1
fi