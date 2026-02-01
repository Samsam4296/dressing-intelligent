// App constants
// Add configuration constants here

export const APP_NAME = 'Dressing Intelligent';
export const APP_VERSION = '1.0.0';

// API Configuration
export const API_CONFIG = {
  WEATHER_CACHE_DURATION: 60 * 60 * 1000, // 1 hour in milliseconds
  RECOMMENDATION_COUNT: 3,
  MAX_PROFILES: 3, // MVP limit
  MAX_REGENERATIONS_PER_DAY: 2,
};

// Performance Targets (NFRs)
export const PERFORMANCE_TARGETS = {
  RECOMMENDATION_GENERATION_MS: 2000, // < 2 seconds
  PROFILE_SWITCH_MS: 500, // < 0.5 seconds
  APP_COLD_START_MS: 3000, // < 3 seconds
  PHOTO_UPLOAD_MS: 8000, // < 8 seconds on 4G
};
