# Firebase Setup for CryptoCurator

Follow these steps to configure Firebase for your crypto news application:

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project" or select existing project
3. Enter project name (e.g., "crypto-curator" or "crypto-news-app")
4. Enable Google Analytics (optional but recommended)
5. Click "Create project"

## 2. Enable Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** authentication
3. Click "Save"

## 3. Enable Firestore Database

1. Go to **Firestore Database** 
2. Click "Create database"
3. Choose **Start in test mode** (we'll secure it later)
4. Select your preferred location (choose closest to your users)
5. Click "Done"

## 4. Create Web App

1. In Project Overview, click **Web app icon** (</>) 
2. Enter app nickname: "crypto-curator-frontend"
3. **Check** "Also set up Firebase Hosting" (optional)
4. Click "Register app"
5. Copy the Firebase configuration object

## 5. Update Your .env File

Replace the placeholder values in your `.env` file with your actual Firebase config:

```env
# Your Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_actual_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# API Configuration (keep as is)
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_DEBUG=true
```

## 6. Test Firebase Connection

1. Save your `.env` file
2. Restart your React development server:
   ```bash
   npm start
   ```
3. Open your browser and go to http://localhost:3001
4. Try registering a new user account
5. Check Firebase Console → Authentication → Users to see if user was created

## 7. Set Up Firestore Security Rules (Important!)

1. Go to **Firestore Database** → **Rules**
2. Replace default rules with these secure rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read/write their own bookmarks
    match /bookmarks/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /articles/{articleId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

3. Click "Publish"

## 8. Optional: Enable Analytics

1. Go to **Analytics** → **Dashboard**
2. Follow setup instructions to add Analytics to your web app
3. This helps track user engagement with your crypto news app

## 🚀 You're Ready!

Your Firebase configuration is complete! Your CryptoCurator app now has:

- ✅ User authentication (signup/login)  
- ✅ Secure Firestore database for user profiles
- ✅ Secure bookmark storage per user
- ✅ Production-ready security rules

## 🔧 Troubleshooting

**If registration fails:**
- Double-check all environment variables in `.env`
- Ensure Email/Password auth is enabled in Firebase Console
- Check browser console for detailed error messages

**If users can't save bookmarks:**
- Verify Firestore rules are published
- Check that user is logged in before bookmarking
- Ensure backend API is running on localhost:3000

## 🔐 Security Note

The current Firestore rules are secure for production. Each user can only access their own data, and all operations require authentication.