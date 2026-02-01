/**
 * Card Component
 *
 * Container component for grouping content with consistent styling.
 * Supports dark mode and various elevation levels.
 */

import { View, Pressable, type ViewProps, type PressableProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

// Card variants
const cardVariants = cva('rounded-lg bg-white dark:bg-neutral-800 overflow-hidden', {
  variants: {
    variant: {
      elevated: 'shadow-md',
      outlined: 'border border-neutral-200 dark:border-neutral-700',
      filled: 'bg-neutral-100 dark:bg-neutral-900',
      ghost: 'bg-transparent',
    },
    padding: {
      none: 'p-0',
      sm: 'p-2',
      md: 'p-4',
      lg: 'p-6',
    },
  },
  defaultVariants: {
    variant: 'elevated',
    padding: 'md',
  },
});

export interface CardProps extends ViewProps, VariantProps<typeof cardVariants> {
  children: ReactNode;
  className?: string;
}

export function Card({ children, variant, padding, className, ...props }: CardProps) {
  return (
    <View className={cn(cardVariants({ variant, padding }), className)} {...props}>
      {children}
    </View>
  );
}

// Pressable Card variant
export interface PressableCardProps
  extends Omit<PressableProps, 'children'>, VariantProps<typeof cardVariants> {
  children: ReactNode;
  className?: string;
}

export function PressableCard({
  children,
  variant,
  padding,
  className,
  ...props
}: PressableCardProps) {
  return (
    <Pressable
      className={cn(cardVariants({ variant, padding }), 'active:opacity-80', className)}
      {...props}>
      {children}
    </Pressable>
  );
}

// Card subcomponents
export function CardHeader({ children, className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={cn('border-b border-neutral-200 pb-2 dark:border-neutral-700', className)}
      {...props}>
      {children}
    </View>
  );
}

export function CardContent({ children, className, ...props }: ViewProps & { className?: string }) {
  return (
    <View className={cn('py-4', className)} {...props}>
      {children}
    </View>
  );
}

export function CardFooter({ children, className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={cn(
        'flex-row justify-end gap-2 border-t border-neutral-200 pt-2 dark:border-neutral-700',
        className
      )}
      {...props}>
      {children}
    </View>
  );
}
