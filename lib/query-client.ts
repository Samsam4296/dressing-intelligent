/**
 * TanStack Query Client Configuration
 *
 * Provides optimized server state caching with automatic background refetching,
 * retry logic, and offline support.
 */

import { QueryClient } from '@tanstack/react-query';

// Query client with optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: 5 minutes for most queries
      staleTime: 5 * 60 * 1000,

      // Cache time: 30 minutes
      gcTime: 30 * 60 * 1000,

      // Retry configuration (NFR-R4: Retry 3x)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch on window focus (good for fresh data)
      refetchOnWindowFocus: true,

      // Don't refetch on mount if data is fresh
      refetchOnMount: true,

      // Enable refetch on reconnect for offline support
      refetchOnReconnect: true,

      // Network mode: always try to fetch, fallback to cache if offline
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,

      // Network mode for mutations
      networkMode: 'offlineFirst',
    },
  },
});

// Query keys factory for type-safe query keys
export const queryKeys = {
  // Auth
  auth: {
    all: ['auth'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
  },

  // Profiles
  profiles: {
    all: ['profiles'] as const,
    list: () => [...queryKeys.profiles.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.profiles.all, 'detail', id] as const,
  },

  // Clothes/Wardrobe
  clothes: {
    all: ['clothes'] as const,
    list: (profileId: string) => [...queryKeys.clothes.all, 'list', profileId] as const,
    detail: (id: string) => [...queryKeys.clothes.all, 'detail', id] as const,
    byCategory: (profileId: string, category: string) =>
      [...queryKeys.clothes.all, 'category', profileId, category] as const,
  },

  // Recommendations
  recommendations: {
    all: ['recommendations'] as const,
    daily: (profileId: string, date: string) =>
      [...queryKeys.recommendations.all, 'daily', profileId, date] as const,
    history: (profileId: string) =>
      [...queryKeys.recommendations.all, 'history', profileId] as const,
  },

  // Weather
  weather: {
    all: ['weather'] as const,
    current: (lat: number, lon: number) => [...queryKeys.weather.all, 'current', lat, lon] as const,
    forecast: (lat: number, lon: number) =>
      [...queryKeys.weather.all, 'forecast', lat, lon] as const,
  },

  // Settings
  settings: {
    all: ['settings'] as const,
    user: (userId: string) => [...queryKeys.settings.all, 'user', userId] as const,
  },
} as const;

// Invalidation helpers
export const invalidateQueries = {
  // Invalidate all profile-related queries
  profiles: () => queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all }),

  // Invalidate clothes for a profile
  clothes: (profileId: string) =>
    queryClient.invalidateQueries({ queryKey: queryKeys.clothes.list(profileId) }),

  // Invalidate all clothes
  allClothes: () => queryClient.invalidateQueries({ queryKey: queryKeys.clothes.all }),

  // Invalidate recommendations
  recommendations: (profileId: string) =>
    queryClient.invalidateQueries({ queryKey: [...queryKeys.recommendations.all, profileId] }),

  // Invalidate everything (for logout)
  all: () => queryClient.invalidateQueries(),

  // Clear cache completely (for logout)
  clearAll: () => queryClient.clear(),
};
