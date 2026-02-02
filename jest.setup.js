// Jest setup file for React Native Testing Library

// Define __DEV__ global for React Native
global.__DEV__ = true;

// Mock nativewind to prevent native module access
jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light', toggleColorScheme: jest.fn() }),
  styled: (component) => component,
}));

// Mock react-native-css-interop
jest.mock('react-native-css-interop', () => ({
  cssInterop: (component) => component,
  remapProps: jest.fn(),
}));

// Mock expo-router to prevent native bridge issues
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  usePathname: () => '/',
  Link: 'Link',
  Stack: {
    Screen: 'Stack.Screen',
  },
  Tabs: {
    Screen: 'Tabs.Screen',
  },
  Slot: 'Slot',
}));

// Mock expo-haptics before tests run
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Error: 'error',
    Warning: 'warning',
  },
}));

// Mock @expo/vector-icons (Ionicons, etc.)
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  AntDesign: 'AntDesign',
  MaterialIcons: 'MaterialIcons',
  FontAwesome: 'FontAwesome',
  createIconSet: jest.fn(() => 'Icon'),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  return {
    default: {
      call: jest.fn(),
      createAnimatedComponent: (component) => component,
      Value: jest.fn(),
      event: jest.fn(),
      add: jest.fn(),
      eq: jest.fn(),
      set: jest.fn(),
      cond: jest.fn(),
      interpolate: jest.fn(),
      View: 'View',
      Extrapolate: { CLAMP: 'clamp' },
      Transition: {
        Together: 'Together',
        Out: 'Out',
        In: 'In',
      },
    },
    useAnimatedStyle: () => ({}),
    useSharedValue: (v) => ({ value: v }),
    withTiming: (v) => v,
    withSpring: (v) => v,
    withSequence: (...args) => args[0],
    FadeIn: { duration: () => ({}) },
    FadeOut: { duration: () => ({}) },
    Layout: {},
  };
});

// Mock @sentry/react-native (Story 0-6)
// Updated to Sentry 6.x API (startSpan instead of startTransaction)
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setContext: jest.fn(),
  addBreadcrumb: jest.fn(),
  // Sentry 6.x API
  startSpan: jest.fn((options, callback) => {
    // Execute the callback with a mock span
    const mockSpan = {
      setAttribute: jest.fn(),
      setStatus: jest.fn(),
      end: jest.fn(),
    };
    if (callback) {
      return callback(mockSpan);
    }
    return mockSpan;
  }),
  startInactiveSpan: jest.fn(() => ({
    setAttribute: jest.fn(),
    setStatus: jest.fn(),
    end: jest.fn(),
  })),
  setMeasurement: jest.fn(),
  // Native crash testing
  nativeCrash: jest.fn(),
  Severity: {
    Fatal: 'fatal',
    Error: 'error',
    Warning: 'warning',
    Info: 'info',
    Debug: 'debug',
  },
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: 'SafeAreaProvider',
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
}));

// Mock @supabase/supabase-js to prevent initialization errors in tests
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signUp: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

// Mock lib/supabase module
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      setSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
  isSupabaseConfigured: jest.fn().mockReturnValue(true),
}));

// Mock react-native-mmkv (Story 0-3, 1.3)
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    contains: jest.fn().mockReturnValue(false),
    clearAll: jest.fn(),
    getAllKeys: jest.fn().mockReturnValue([]),
  })),
}));

// Mock lib/storage module (Story 0-3, 1.3)
jest.mock('@/lib/storage', () => ({
  storage: {
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    contains: jest.fn().mockReturnValue(false),
    clearAll: jest.fn(),
    getAllKeys: jest.fn().mockReturnValue([]),
  },
  STORAGE_KEYS: {
    AUTH_STATE: 'auth-state',
    PROFILE_STATE: 'profile-state',
    SETTINGS_STATE: 'settings-state',
    WARDROBE_CACHE: 'wardrobe-cache',
    RECOMMENDATIONS_CACHE: 'recommendations-cache',
    LAST_SYNC: 'last-sync',
  },
  storageHelpers: {
    getJSON: jest.fn().mockReturnValue(null),
    setJSON: jest.fn(),
    has: jest.fn().mockReturnValue(false),
    clearAll: jest.fn(),
    getAllKeys: jest.fn().mockReturnValue([]),
  },
  zustandStorage: {
    getItem: jest.fn().mockReturnValue(null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

// Global test timeout
jest.setTimeout(10000);
