// Vocab Master Configuration
// Edit this file to switch between production and local development servers

const AppConfig = {
  // Version Information
  VERSION: '1.0.2',
  BUILD_DATE: '2025-12-16',
  BUILD_TIME: new Date().toISOString(),

  // Backend Server Configuration
  // Uncomment ONE of the following options:

  // OPTION 1: Production Server (Render)
  API_BASE_URL: 'https://vocab-master-backend.onrender.com',


  // OPTION 2: Local Development Server
  // API_BASE_URL: "http://localhost:3000",

  // Feature Flags
  USE_MONGODB: true, // Set to false to use localStorage fallback
  ENABLE_OFFLINE_MODE: false, // Future feature for offline support
};

// Make config globally available
window.AppConfig = AppConfig;

// Log version info to console
console.log(`%cVocab Master ${AppConfig.VERSION}`, 'font-weight: bold; color: #3B82F6; font-size: 14px');
console.log(`Build: ${AppConfig.BUILD_DATE}`);
