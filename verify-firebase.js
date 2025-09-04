#!/usr/bin/env node
/**
 * Firebase Configuration Verification Script
 * Run this to check if your Firebase config is properly set up
 */

const fs = require('fs');
const path = require('path');

function verifyFirebaseConfig() {
  console.log('🔍 Verifying Firebase Configuration...\n');

  // Check if .env file exists
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found!');
    console.log('   Run: cp .env.example .env');
    console.log('   Then update it with your Firebase config\n');
    return false;
  }

  // Read .env file
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });

  // Check required Firebase variables
  const requiredVars = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN', 
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_STORAGE_BUCKET',
    'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
    'REACT_APP_FIREBASE_APP_ID'
  ];

  let allValid = true;

  requiredVars.forEach(varName => {
    const value = envVars[varName];
    
    if (!value || value.includes('your-') || value === 'your_actual_api_key_here') {
      console.log(`❌ ${varName}: Not configured`);
      allValid = false;
    } else {
      console.log(`✅ ${varName}: Configured`);
    }
  });

  // Check API URL
  const apiUrl = envVars['REACT_APP_API_URL'];
  if (apiUrl && apiUrl !== 'http://localhost:3000/api') {
    console.log(`⚠️  REACT_APP_API_URL: Custom URL (${apiUrl})`);
  } else {
    console.log(`✅ REACT_APP_API_URL: Default backend URL`);
  }

  console.log('\n' + '='.repeat(50));

  if (allValid) {
    console.log('🎉 Firebase configuration looks good!');
    console.log('\nNext steps:');
    console.log('1. Make sure your Firebase project has Auth & Firestore enabled');
    console.log('2. Start your backend: cd ../crypto-news-curator-backend && npm start');
    console.log('3. Your React app should work with authentication now!');
  } else {
    console.log('❌ Firebase configuration incomplete');
    console.log('\nPlease:');
    console.log('1. Follow the instructions in FIREBASE_SETUP.md');
    console.log('2. Update your .env file with actual Firebase values');
    console.log('3. Run this script again to verify');
  }

  console.log('\n📚 Need help? Check FIREBASE_SETUP.md for detailed instructions');
  
  return allValid;
}

// Run verification
verifyFirebaseConfig();