// Vocab Master Configuration
// Edit this file to switch between production and local development servers

const AppConfig = {
  // Backend Server Configuration
  // Uncomment ONE of the following options:

  // OPTION 1: Production Server (Render)
  TTS_BASE_URL: 'https://vocab-master-backend.onrender.com',
  API_BASE_URL: 'https://vocab-master-backend.onrender.com',

  // OPTION 2: Local Development Server
  // TTS_BASE_URL: 'http://localhost:3000',
  // API_BASE_URL: 'http://localhost:3000',

  // Feature Flags
  USE_MONGODB: true,  // Set to false to use localStorage fallback
  ENABLE_OFFLINE_MODE: false,  // Future feature for offline support
};

// Make config globally available
window.AppConfig = AppConfig;
