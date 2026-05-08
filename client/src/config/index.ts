const LOCAL_IP = '192.168.29.71';

export const API_URL = __DEV__ 
  ? `http://${LOCAL_IP}:5000` 
  : process.env.API_URL || 'http://localhost:5000';

// Other configuration constants can be added here
export const APP_NAME = 'MADProject';
export const VERSION = '1.0.0';
