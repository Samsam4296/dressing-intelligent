/**
 * Text Component
 *
 * Typography component with variants for consistent text styling.
 * Supports dark mode and accessibility (minimum 14pt font).
 */

import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Text variants
const textVariants = cva('text-neutral-900 dark:text-neutral-100', {
  variants: {
    variant: {
      // Headings
      h1: 'text-4xl font-bold',
      h2: 'text-3xl font-bold',
      h3: 'text-2xl font-semibold',
      h4: 'text-xl font-semibold',
      // Body
      body: 'text-base',
      bodyLarge: 'text-lg',
      bodySmall: 'text-sm', // Minimum readable (14pt)
      // Labels
      label: 'text-sm font-medium',
      caption: 'text-xs text-neutral-500 dark:text-neutral-400',
      // Links
      link: 'text-primary-500 underline',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    },
    color: {
      default: '',
      primary: 'text-primary-500',
      secondary: 'text-secondary-500',
      success: 'text-success-500',
      warning: 'text-warning-500',
      error: 'text-error-500',
      muted: 'text-neutral-500 dark:text-neutral-400',
      inverse: 'text-white dark:text-neutral-900',
    },
  },
  defaultVariants: {
    variant: 'body',
    align: 'left',
    color: 'default',
  },
});

export interface TextProps extends RNTextProps, VariantProps<typeof textVariants> {
  className?: string;
}

export function Text({ children, variant, weight, align, color, className, ...props }: TextProps) {
  return (
    <RNText className={cn(textVariants({ variant, weight, align, color }), className)} {...props}>
      {children}
    </RNText>
  );
}

// Convenience components for headings
export function H1(props: Omit<TextProps, 'variant'>) {
  return <Text variant="h1" {...props} />;
}

export function H2(props: Omit<TextProps, 'variant'>) {
  return <Text variant="h2" {...props} />;
}

export function H3(props: Omit<TextProps, 'variant'>) {
  return <Text variant="h3" {...props} />;
}

export function H4(props: Omit<TextProps, 'variant'>) {
  return <Text variant="h4" {...props} />;
}

export function Label(props: Omit<TextProps, 'variant'>) {
  return <Text variant="label" {...props} />;
}

export function Caption(props: Omit<TextProps, 'variant'>) {
  return <Text variant="caption" {...props} />;
}
