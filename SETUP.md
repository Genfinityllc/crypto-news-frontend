# CryptoCurator Frontend Setup Guide

## 🔧 Fixing NPM Permission Issues

You have npm permission issues that need to be resolved before installation. Choose one of these solutions:

### Option 1: Fix NPM Permissions (Recommended)
```bash
# Fix npm cache ownership
sudo chown -R $(whoami) ~/.npm

# Then install dependencies
cd /Users/valorkopeny/crypto-news-frontend
npm install
```

### Option 2: Delete NPM Cache
```bash
# Remove corrupted cache
rm -rf ~/.npm

# Install dependencies
cd /Users/valorkopeny/crypto-news-frontend
npm install
```

### Option 3: Use Yarn Instead
```bash
# Install yarn if you don't have it
npm install -g yarn

# Use yarn to install dependencies
cd /Users/valorkopeny/crypto-news-frontend
yarn install
```

## 🚀 Quick Start (After Dependencies)

1. **Configure Environment:**
   ```bash
   # .env file is already created, update it with your Firebase config
   nano .env
   ```

2. **Required Environment Variables:**
   ```env
   REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your-firebase-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
   REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef123456789
   REACT_APP_API_URL=http://localhost:3000/api
   ```

3. **Start Development Server:**
   ```bash
   npm start
   ```

## 🔑 Firebase Setup Steps

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select existing
3. Enable Authentication > Sign-in method > Email/Password
4. Enable Firestore Database
5. Go to Project Settings > General > Your apps
6. Add a web app and copy the config
7. Update your `.env` file with the Firebase config values

## 🔄 Backend Integration

Make sure your backend is running on `http://localhost:3000` with the following features:
- ✅ Firebase authentication middleware
- ✅ News API with filtering and search
- ✅ User bookmarks functionality
- ✅ AI summary generation
- ✅ Breaking news updates every 2 minutes

## 📱 Features Ready to Test

Once running, you'll have access to:
- 🔐 User registration and login
- 📰 Real-time crypto news updates
- 🔍 Advanced search and filtering
- ⭐ Bookmark favorite articles
- 🤖 AI-powered article summaries
- 📱 Mobile-responsive design

## 🐛 Troubleshooting

**If you get permission errors:**
- Try the permission fixes above
- Make sure you have write access to your home directory
- Consider using a Node version manager like nvm

**If Firebase connection fails:**
- Double-check all environment variables
- Ensure Firebase project has Auth and Firestore enabled
- Check browser console for detailed error messages

**If backend connection fails:**
- Verify backend is running on port 3000
- Check that backend has Express dependencies installed
- Update REACT_APP_API_URL if backend runs on different port