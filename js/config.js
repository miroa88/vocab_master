// Vocab Master Configuration
// Edit this file to switch between production and local development servers

const AppConfig = {
  // TTS Backend Server Configuration
  // Uncomment ONE of the following options:

  // OPTION 1: Production Server (Render)
  TTS_BASE_URL: 'https://vocab-master-backend.onrender.com',

  // OPTION 2: Local Development Server
  // TTS_BASE_URL: 'http://localhost:3000',
};

// Make config globally available
window.AppConfig = AppConfig;
