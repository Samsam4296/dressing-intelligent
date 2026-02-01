// Environment variable type declarations
// Ensures type safety for process.env

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Supabase
      EXPO_PUBLIC_SUPABASE_URL: string;
      EXPO_PUBLIC_SUPABASE_ANON_KEY: string;

      // Weather API (Visual Crossing)
      EXPO_PUBLIC_VISUAL_CROSSING_KEY: string;

      // Cloudinary
      EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME: string;
      EXPO_PUBLIC_CLOUDINARY_API_KEY: string;
      EXPO_PUBLIC_CLOUDINARY_API_SECRET: string;

      // MMKV Encryption
      EXPO_PUBLIC_MMKV_KEY: string;

      // Sentry
      EXPO_PUBLIC_SENTRY_DSN: string;

      // Environment
      EXPO_PUBLIC_ENV: 'development' | 'staging' | 'production';
    }
  }
}

export {};
