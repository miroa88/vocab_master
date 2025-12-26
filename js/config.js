const AppConfig = {
  VERSION: '1.2.0',
  BUILD_DATE: '2024-12-25',
  BUILD_TIME: new Date().toISOString(),

  API_BASE_URL: 'https://instyle-node-server.onrender.com',
  // API_BASE_URL: 'http://localhost:5000',
  USE_MONGODB: true,
  ENABLE_OFFLINE_MODE: false,
};

window.AppConfig = AppConfig;

console.log(`%cVocab Master ${AppConfig.VERSION}`, 'font-weight: bold; color: #3B82F6; font-size: 14px');
console.log(`Build: ${AppConfig.BUILD_DATE}`);
