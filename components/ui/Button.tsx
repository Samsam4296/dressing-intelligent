/**
 * Button Component
 *
 * A customizable button with multiple variants and sizes.
 * Supports dark mode and accessibility requirements (44x44 touch target).
 */

import { Pressable, ActivityIndicator } from 'react-native';
import { Text } from './Text';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';

// Button variants using class-variance-authority
const buttonVariants = cva(
  // Base styles - 44px min height for accessibility
  'flex-row items-center justify-center rounded-lg min-h-[44px] px-4',
  {
    variants: {
      variant: {
        primary: 'bg-primary-500 active:bg-primary-600',
        secondary: 'bg-secondary-500 active:bg-secondary-600',
        outline:
          'border-2 border-primary-500 bg-transparent active:bg-primary-50 dark:active:bg-primary-950',
        ghost: 'bg-transparent active:bg-neutral-100 dark:active:bg-neutral-800',
        danger: 'bg-error-500 active:bg-error-600',
        success: 'bg-success-500 active:bg-success-600',
      },
      size: {
        sm: 'min-h-[36px] px-3',
        md: 'min-h-[44px] px-4',
        lg: 'min-h-[52px] px-6',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
      disabled: {
        true: 'opacity-50',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
      disabled: false,
    },
  }
);

// Text color variants
const textVariants = cva('font-semibold text-center', {
  variants: {
    variant: {
      primary: 'text-white',
      secondary: 'text-white',
      outline: 'text-primary-500',
      ghost: 'text-neutral-900 dark:text-neutral-100',
      danger: 'text-white',
      success: 'text-white',
    },
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

export interface ButtonProps extends VariantProps<typeof buttonVariants> {
  children: ReactNode;
  onPress?: () => void;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  haptic?: boolean;
  className?: string;
  textClassName?: string;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  haptic = true,
  className,
  textClassName,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;

    // Haptic feedback on press
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onPress?.();
  };

  const content = (
    <>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? '#0ea5e9' : '#ffffff'}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && <>{icon}</>}
          {typeof children === 'string' ? (
            <Text
              className={cn(
                textVariants({ variant, size }),
                icon && iconPosition === 'left' && 'ml-2',
                icon && iconPosition === 'right' && 'mr-2',
                textClassName
              )}>
              {children}
            </Text>
          ) : (
            children
          )}
          {icon && iconPosition === 'right' && <>{icon}</>}
        </>
      )}
    </>
  );

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      className={cn(buttonVariants({ variant, size, fullWidth, disabled: isDisabled }), className)}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}>
      {content}
    </Pressable>
  );
}
