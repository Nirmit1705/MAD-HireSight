// API Configuration
// For Android emulator, use 10.0.2.2 instead of localhost
// For physical device, use your computer's IP address (e.g., 192.168.x.x)
export const API_URL = __DEV__ 
  ? 'http://10.0.2.2:5000'  // Android emulator - matches server port
  : process.env.API_URL || 'http://localhost:5000';

// Other configuration constants can be added here
export const APP_NAME = 'MADProject';
export const VERSION = '1.0.0';
