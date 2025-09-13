/**
 * Style mapping utilities for widget management
 * Replaces dynamic Tailwind classes with proper mappings for better compilation
 */

import type { WidgetAlignment, WidgetFontWeight, WidgetAnimationType } from './types';

// Font weight mappings
export const FONT_WEIGHT_MAP: Record<WidgetFontWeight, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

// Alignment mappings
export const ALIGNMENT_MAP: Record<WidgetAlignment, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

// Text alignment mappings
export const TEXT_ALIGNMENT_MAP: Record<WidgetAlignment, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

// Animation mappings
export const ANIMATION_MAP: Record<WidgetAnimationType, string> = {
  none: '',
  fade: 'animate-pulse',
  slide: 'animate-pulse',
  bounce: 'animate-bounce',
  scale: 'animate-pulse',
};

// Spacing utility for consistent spacing
export function getSpacingStyle(spacing: number): React.CSSProperties {
  const spacingValue = Math.max(1, Math.floor(spacing / 4));
  return {
    '--spacing': `${spacingValue * 0.25}rem`,
    gap: `${spacingValue * 0.25}rem`,
    marginBottom: `${spacingValue * 0.25}rem`,
  } as React.CSSProperties;
}

// Device specific styles
export const DEVICE_STYLES = {
  desktop: 'transition-all duration-500 ease-in-out relative max-w-6xl w-full',
  tablet: 'transition-all duration-500 relative w-96',
  mobile: 'transition-all duration-500 relative w-80',
} as const;

export const DEVICE_FRAME_STYLES = {
  desktop: 'rounded-lg border-2 border-gray-300 bg-gray-900 p-6 shadow-2xl',
  tablet: 'rounded-2xl border-4 border-gray-400 bg-black p-4 shadow-2xl',
  mobile: 'rounded-3xl border-4 border-gray-800 bg-black p-2 shadow-2xl',
} as const;

export const DEVICE_SCREEN_STYLES = {
  desktop: 'relative overflow-hidden bg-white transition-all duration-500 rounded min-h-96',
  tablet: 'relative overflow-hidden bg-white transition-all duration-500 rounded-xl aspect-[4/3]',
  mobile: 'relative overflow-hidden bg-white transition-all duration-500 rounded-2xl aspect-[9/16]',
} as const;

export const WIDGET_SCALE_MAP = {
  desktop: 'scale-100',
  tablet: 'scale-75',
  mobile: 'scale-50',
} as const;

// Utility to create safe inline styles instead of dynamic classes
export function createWidgetContainerStyle(
  config: {
    width: number;
    height: number;
    backgroundColor: string;
    borderRadius: number;
    borderWidth?: number;
    borderColor?: string;
    shadowIntensity: number;
    fontFamily: string;
    textColor: string;
    padding?: number;
  },
  device: 'desktop' | 'tablet' | 'mobile'
): React.CSSProperties {
  const maxWidth = device === 'mobile' ? 280 : device === 'tablet' ? 350 : 450;
  const maxHeight = device === 'mobile' ? 400 : device === 'tablet' ? 500 : 600;
  
  return {
    width: Math.min(config.width, maxWidth),
    height: Math.min(config.height, maxHeight),
    backgroundColor: config.backgroundColor,
    borderRadius: config.borderRadius,
    border: `${config.borderWidth || 0}px solid ${config.borderColor || 'transparent'}`,
    boxShadow: `0 ${config.shadowIntensity * 2}px ${config.shadowIntensity * 4}px rgba(0,0,0,0.1)`,
    fontFamily: config.fontFamily === 'system' ? 'system-ui' : config.fontFamily,
    color: config.textColor,
    padding: config.padding,
  };
}

// Safe CSS custom properties for dynamic values
export function createCustomProperties(config: {
  spacing?: number;
  fontSize?: number;
  lineHeight?: number;
}): React.CSSProperties {
  return {
    '--widget-spacing': config.spacing ? `${Math.max(1, Math.floor(config.spacing / 4)) * 0.25}rem` : undefined,
    '--widget-font-size': config.fontSize ? `${config.fontSize}px` : undefined,
    '--widget-line-height': config.lineHeight ? config.lineHeight.toString() : undefined,
  } as React.CSSProperties;
}