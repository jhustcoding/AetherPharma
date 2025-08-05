// Central configuration for API endpoints
const API_HOST = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';
const API_BASE_URL = `${API_HOST}/api/v1`;

export const config = {
  API_HOST,
  API_BASE_URL,
  // Helper function to get full API URL
  getApiUrl: (endpoint: string) => {
    if (endpoint.startsWith('/')) {
      return `${API_BASE_URL}${endpoint}`;
    }
    return `${API_BASE_URL}/${endpoint}`;
  }
};

// Log configuration on startup (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('API Configuration:', {
    API_HOST,
    API_BASE_URL,
    REACT_APP_API_BASE_URL: process.env.REACT_APP_API_BASE_URL
  });
}

export default config;