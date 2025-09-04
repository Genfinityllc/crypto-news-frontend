# CryptoCurator Frontend

A modern React frontend for the CryptoCurator crypto news application with Firebase authentication and real-time updates.

## ✨ Features

- **🔥 Firebase Authentication** - Secure user registration and login
- **📰 Real-time News** - Live crypto news updates every 2 minutes  
- **🔍 Advanced Search** - Filter by network, category, and keywords
- **⭐ Bookmarks** - Save and organize favorite articles
- **🤖 AI Summaries** - Generate AI-powered article summaries
- **📱 Responsive Design** - Works on desktop, tablet, and mobile
- **🌙 Dark Theme** - Optimized for crypto traders and enthusiasts

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Running CryptoCurator backend on `http://localhost:3000`
- Firebase project with Auth and Firestore enabled

### Installation

1. **Install dependencies:**
```bash
cd crypto-news-frontend
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
```

3. **Update `.env` with your Firebase config:**
```env
REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-firebase-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef123456789
```

4. **Start the development server:**
```bash
npm start
```

5. **Open http://localhost:3001** (or the next available port)

## 🏗️ Project Structure

```
src/
├── components/
│   ├── auth/              # Authentication components
│   │   ├── LoginForm.js
│   │   ├── SignupForm.js
│   │   ├── ProfileManager.js
│   │   └── ProtectedRoute.js
│   ├── common/            # Shared components
│   │   └── Navigation.js
│   └── news/              # News components
│       └── NewsCard.js
├── contexts/              # React contexts
│   └── AuthContext.js     # Firebase auth state
├── hooks/                 # Custom hooks
│   ├── useNews.js         # News data management
│   └── useBookmarks.js    # Bookmarks management
├── pages/                 # Page components
│   ├── Dashboard.js       # Main news dashboard
│   └── Bookmarks.js       # User bookmarks page
├── services/              # API services
│   └── api.js             # Backend API calls
├── config/                # Configuration
│   └── firebase.js        # Firebase setup
└── App.js                 # Main app component
```

## 🔑 Key Components

### Authentication
- **LoginForm** - Firebase email/password signin
- **SignupForm** - User registration with profile creation
- **ProfileManager** - User preferences and settings
- **ProtectedRoute** - Route guard for authenticated users

### News Features
- **Dashboard** - Main news feed with filtering and search
- **NewsCard** - Individual article display with bookmarking
- **Breaking News** - Real-time breaking news alerts
- **AI Summaries** - On-demand AI article summarization

### User Features
- **Bookmarks** - Save and manage favorite articles
- **Profile Management** - Update preferences and notifications
- **Responsive Design** - Mobile-first responsive layout

## 🔄 Real-time Features

- **Auto-refresh** breaking news every 2 minutes
- **Live updates** when new articles are published
- **Instant bookmarking** with optimistic UI updates
- **Real-time search** with debounced input

## 🎨 Styling

The app uses `styled-components` for a modern dark theme optimized for crypto content:

- **Dark background** (#0a0a0a) with high contrast text
- **Crypto blue** (#0066cc) accent color for CTAs and links
- **Responsive grid** system for articles
- **Mobile-first** responsive breakpoints
- **Smooth animations** and hover effects

## 📱 Mobile Support

- Hamburger menu navigation
- Touch-friendly button sizes
- Optimized article cards for mobile reading
- Responsive typography and spacing
- Pull-to-refresh functionality

## 🔧 Configuration

### Firebase Setup
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication with Email/Password
3. Enable Firestore Database
4. Add your web app and copy the config
5. Update `.env` file with your credentials

### API Configuration
- Backend API URL: `REACT_APP_API_URL`
- Default: `http://localhost:3000/api`
- Production: Update to your deployed backend URL

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

### Deploy to Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

### Environment Variables for Production
Make sure to set these in your deployment platform:
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`
- `REACT_APP_API_URL`

## 🔍 Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## 📊 Performance

- **Code splitting** with React.lazy for optimal loading
- **Image optimization** with lazy loading
- **API request caching** to reduce server load
- **Optimized bundle size** with tree shaking
- **Service worker** for offline functionality (PWA ready)

## 🐛 Troubleshooting

### Common Issues

**Firebase Config Error:**
- Double-check all Firebase environment variables
- Ensure Firebase project has Auth and Firestore enabled

**API Connection Error:**
- Verify backend is running on `http://localhost:3000`
- Check CORS settings in backend
- Update `REACT_APP_API_URL` if needed

**Build Errors:**
- Clear node_modules and package-lock.json, then `npm install`
- Check for missing dependencies
- Ensure Node.js version is 16+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Happy crypto news curating! 🚀**