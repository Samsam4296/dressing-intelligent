// Jest setup file for React Native Testing Library

// Define __DEV__ global for React Native
global.__DEV__ = true;

// Mock react-native core components to prevent native module errors
jest.mock('react-native', () => {
  const React = require('react');

  const MockView = ({ children, testID, ...props }) =>
    React.createElement('View', { testID, ...props }, children);
  const MockText = ({ children, testID, ...props }) =>
    React.createElement('Text', { testID, ...props }, children);
  const MockTouchableOpacity = ({ children, testID, onPress, disabled, accessibilityRole, accessibilityLabel, accessibilityState, ...props }) =>
    React.createElement('TouchableOpacity', {
      testID,
      onPress,
      disabled,
      accessibilityRole,
      accessibilityLabel,
      accessibilityState,
      ...props
    }, children);
  const MockTextInput = ({ testID, value, onChangeText, placeholder, maxLength, accessibilityLabel, accessibilityHint, ...props }) =>
    React.createElement('TextInput', {
      testID,
      value,
      onChangeText,
      placeholder,
      maxLength,
      accessibilityLabel,
      accessibilityHint,
      ...props
    });
  const MockModal = ({ children, visible, testID, ...props }) =>
    visible ? React.createElement('Modal', { testID, ...props }, children) : null;
  const MockPressable = ({ children, testID, onPress, ...props }) =>
    React.createElement('Pressable', { testID, onPress, ...props }, children);
  const MockScrollView = ({ children, testID, ...props }) =>
    React.createElement('ScrollView', { testID, ...props }, children);
  const MockImage = ({ testID, source, ...props }) =>
    React.createElement('Image', { testID, source, ...props });
  const MockActivityIndicator = ({ testID, ...props }) =>
    React.createElement('ActivityIndicator', { testID, ...props });

  return {
    View: MockView,
    Text: MockText,
    TouchableOpacity: MockTouchableOpacity,
    TextInput: MockTextInput,
    Modal: MockModal,
    Pressable: MockPressable,
    ScrollView: MockScrollView,
    Image: MockImage,
    ActivityIndicator: MockActivityIndicator,
    StyleSheet: {
      create: (styles) => styles,
      flatten: (style) => style,
      hairlineWidth: 1,
    },
    Platform: {
      OS: 'ios',
      select: (obj) => obj.ios || obj.default,
      Version: 14,
    },
    Dimensions: {
      get: () => ({ width: 390, height: 844 }),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    Animated: {
      View: MockView,
      Text: MockText,
      Image: MockImage,
      ScrollView: MockScrollView,
      createAnimatedComponent: (component) => component,
      timing: () => ({ start: jest.fn() }),
      spring: () => ({ start: jest.fn() }),
      Value: jest.fn(() => ({
        setValue: jest.fn(),
        interpolate: jest.fn(() => ({ __getValue: () => 0 })),
      })),
      event: jest.fn(),
      add: jest.fn(),
      multiply: jest.fn(),
    },
    Keyboard: {
      dismiss: jest.fn(),
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      removeListener: jest.fn(),
    },
    Alert: {
      alert: jest.fn(),
    },
    Linking: {
      openURL: jest.fn(),
      canOpenURL: jest.fn().mockResolvedValue(true),
    },
    PixelRatio: {
      get: () => 2,
      getFontScale: () => 1,
      getPixelSizeForLayoutSize: (size) => size * 2,
      roundToNearestPixel: (size) => size,
    },
    NativeModules: {},
    useColorScheme: () => 'light',
    useWindowDimensions: () => ({ width: 390, height: 844 }),
  };
});

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
  const React = require('react');
  const MockAnimatedView = ({ children, testID, entering, exiting, layout, ...props }) =>
    React.createElement('Animated.View', { testID, ...props }, children);

  // Create chainable animation objects
  const createChainableAnimation = () => {
    const chainable = {
      duration: () => chainable,
      delay: () => chainable,
      springify: () => chainable,
      damping: () => chainable,
      stiffness: () => chainable,
      mass: () => chainable,
      withInitialValues: () => chainable,
      withCallback: () => chainable,
      easing: () => chainable,
    };
    return chainable;
  };

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
      View: MockAnimatedView,
      Text: 'Animated.Text',
      Image: 'Animated.Image',
      ScrollView: 'Animated.ScrollView',
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
    FadeIn: createChainableAnimation(),
    FadeOut: createChainableAnimation(),
    FadeInDown: createChainableAnimation(),
    FadeOutDown: createChainableAnimation(),
    FadeInUp: createChainableAnimation(),
    FadeOutUp: createChainableAnimation(),
    FadeInRight: createChainableAnimation(),
    FadeOutRight: createChainableAnimation(),
    FadeInLeft: createChainableAnimation(),
    FadeOutLeft: createChainableAnimation(),
    SlideInDown: createChainableAnimation(),
    SlideOutDown: createChainableAnimation(),
    SlideInUp: createChainableAnimation(),
    SlideOutUp: createChainableAnimation(),
    SlideInRight: createChainableAnimation(),
    SlideOutRight: createChainableAnimation(),
    SlideInLeft: createChainableAnimation(),
    SlideOutLeft: createChainableAnimation(),
    Layout: createChainableAnimation(),
    LinearTransition: createChainableAnimation(),
    SequencedTransition: createChainableAnimation(),
    ZoomIn: createChainableAnimation(),
    ZoomOut: createChainableAnimation(),
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
      // Story 1.4: Password reset
      resetPasswordForEmail: jest.fn().mockResolvedValue({ data: {}, error: null }),
      updateUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
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
      // Story 1.4: Password reset
      resetPasswordForEmail: jest.fn().mockResolvedValue({ data: {}, error: null }),
      updateUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      verifyOtp: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
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

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiGet: jest.fn().mockResolvedValue([]),
  multiSet: jest.fn().mockResolvedValue(undefined),
  multiRemove: jest.fn().mockResolvedValue(undefined),
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

// Mock expo-image-picker (Story 1.5)
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: true }),
  MediaTypeOptions: {
    Images: 'Images',
    Videos: 'Videos',
    All: 'All',
  },
}));

// Mock expo-image-manipulator (Story 1.5)
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({ uri: 'compressed-uri.jpg' }),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
    WEBP: 'webp',
  },
}));

// Mock expo-linking
jest.mock('expo-linking', () => ({
  openSettings: jest.fn(),
  openURL: jest.fn(),
  canOpenURL: jest.fn().mockResolvedValue(true),
}));

// Mock @react-native-community/netinfo (Story 1.5)
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  addEventListener: jest.fn(() => jest.fn()),
  useNetInfo: jest.fn(() => ({ isConnected: true, isInternetReachable: true })),
}));

// Mock react-native-keyboard-aware-scroll-view (Story 1.5)
jest.mock('react-native-keyboard-aware-scroll-view', () => ({
  KeyboardAwareScrollView: 'KeyboardAwareScrollView',
}));

// Note: react-native-mmkv is mocked locally in storage.test.ts
// Global mock removed to avoid conflicts with test-specific mocks

// Global test timeout
jest.setTimeout(10000);
