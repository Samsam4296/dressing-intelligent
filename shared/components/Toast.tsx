/**
 * Toast Component
 * Story 1.6: Création Profils Additionnels
 *
 * Simple toast notification system for success/error messages.
 * Uses Reanimated for smooth 60fps animations.
 *
 * NFR-A1: Touch targets 44x44 minimum
 * NFR-P1: Animations run at 60fps using Reanimated
 */

import { useEffect, useCallback } from 'react';
import { Text, Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { create } from 'zustand';

// ============================================
// Types
// ============================================

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastState {
  visible: boolean;
  type: ToastType;
  message: string;
  show: (options: ToastOptions) => void;
  hide: () => void;
}

// ============================================
// Toast Store (Zustand for UI state)
// ============================================

const useToastStore = create<ToastState>((set) => ({
  visible: false,
  type: 'info',
  message: '',
  show: (options) =>
    set({
      visible: true,
      type: options.type,
      message: options.message,
    }),
  hide: () => set({ visible: false }),
}));

// ============================================
// Helper Functions
// ============================================

/**
 * Show a toast notification
 * @param options Toast configuration
 */
export const showToast = (options: ToastOptions): void => {
  useToastStore.getState().show(options);
};

/**
 * Hide the current toast
 */
export const hideToast = (): void => {
  useToastStore.getState().hide();
};

// ============================================
// Toast Configuration
// ============================================

const TOAST_CONFIG: Record<ToastType, { icon: keyof typeof Ionicons.glyphMap; bgColor: string; iconColor: string }> = {
  success: {
    icon: 'checkmark-circle',
    bgColor: 'bg-green-600',
    iconColor: '#FFFFFF',
  },
  error: {
    icon: 'alert-circle',
    bgColor: 'bg-red-600',
    iconColor: '#FFFFFF',
  },
  warning: {
    icon: 'warning',
    bgColor: 'bg-yellow-500',
    iconColor: '#FFFFFF',
  },
  info: {
    icon: 'information-circle',
    bgColor: 'bg-blue-600',
    iconColor: '#FFFFFF',
  },
};

const DEFAULT_DURATION = 3000;

// ============================================
// Toast Component
// ============================================

/**
 * Toast notification component
 * Place this at the root of your app (e.g., in _layout.tsx)
 *
 * @example
 * ```tsx
 * // In _layout.tsx
 * import { Toast } from '@/shared/components/Toast';
 *
 * return (
 *   <>
 *     <Stack />
 *     <Toast />
 *   </>
 * );
 *
 * // In any component
 * import { showToast } from '@/shared/components/Toast';
 *
 * showToast({ type: 'success', message: 'Profil créé avec succès' });
 * ```
 */
export const Toast = () => {
  const { visible, type, message, hide } = useToastStore();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  const config = TOAST_CONFIG[type];

  const handleHide = useCallback(() => {
    hide();
  }, [hide]);

  useEffect(() => {
    if (visible) {
      // Slide in
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });

      // Auto hide after duration
      translateY.value = withDelay(
        DEFAULT_DURATION,
        withTiming(-100, { duration: 300 }, (finished) => {
          if (finished) {
            runOnJS(handleHide)();
          }
        })
      );
      opacity.value = withDelay(DEFAULT_DURATION, withTiming(0, { duration: 300 }));
    } else {
      translateY.value = -100;
      opacity.value = 0;
    }
  }, [visible, translateY, opacity, handleHide]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible && opacity.value === 0) {
    return null;
  }

  return (
    <Animated.View
      style={animatedStyle}
      className="absolute top-12 left-4 right-4 z-50"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Pressable
        className={`flex-row items-center p-4 rounded-xl shadow-lg min-h-[56px] ${config.bgColor}`}
        onPress={handleHide}
        accessibilityRole="button"
        accessibilityLabel="Fermer la notification"
        testID="toast-container"
      >
        <Ionicons name={config.icon} size={24} color={config.iconColor} />
        <Text
          className="flex-1 ml-3 text-white font-medium text-base"
          numberOfLines={2}
          testID="toast-message"
        >
          {message}
        </Text>
        <View className="min-w-[44px] min-h-[44px] items-center justify-center">
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default Toast;
