/**
 * Central theme for the app.
 *
 * To re-theme the entire app, edit ONLY the color values in the `Colors`
 * object below (both `light` and `dark`). Screens, buttons, inputs, links,
 * the native tab bar, and headers all read from this palette.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    background: '#F8FAF8',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E8F5E9',
    card: '#FFFFFF',
    border: '#E5E7EB',
    inputBackground: '#F3F4F6',
    primary: '#18d6b0',
    primaryContrast: '#FFFFFF',
    secondary: '#047857',
    accent: '#D97706',
    success: '#059669',
    danger: '#DC2626',
    warning: '#D97706',
    bgTop: '#07a372',
    bgBottom: '#F8FAF8',
  },
  dark: {
    text: '#F0F0F0',
    textSecondary: '#8A969E',
    background: '#121619',
    backgroundElement: '#1C2226',
    backgroundSelected: '#2B3B36',
    card: '#1C2226',
    border: '#2A3539',
    inputBackground: '#1C2226',
    primary: '#18d6b0',
    primaryContrast: '#121619',
    secondary: '#3AAFA9',
    accent: '#E5A93C',
    success: '#18d6b0',
    danger: '#F87171',
    warning: '#E5A93C',
    bgTop: '#0b3c73',
    bgBottom: '#121619',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

const baseFonts = {
  regular: { fontFamily: Platform.select({ ios: 'System', web: 'var(--font-display)', default: 'sans-serif' }), fontWeight: '400' as const },
  medium: { fontFamily: Platform.select({ ios: 'System', web: 'var(--font-display)', default: 'sans-serif' }), fontWeight: '500' as const },
  bold: { fontFamily: Platform.select({ ios: 'System', web: 'var(--font-display)', default: 'sans-serif' }), fontWeight: '700' as const },
  heavy: { fontFamily: Platform.select({ ios: 'System', web: 'var(--font-display)', default: 'sans-serif' }), fontWeight: '800' as const },
};

/** Map the app palette into a React Navigation theme (headers + native tab bar). */
export function navigationTheme(scheme: 'light' | 'dark') {
  const c = Colors[scheme];
  return {
    dark: scheme === 'dark',
    colors: {
      primary: c.primary,
      background: c.background,
      card: c.card,
      text: c.text,
      border: c.border,
      notification: c.secondary,
    },
    fonts: baseFonts,
  };
}

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Reusable modern card shadow style */
export const CardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  android: {
    elevation: 3,
  },
  default: {},
});

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/** App-wide custom colors (gradients, cards, pills, etc.) */
export const AppColors = {
  primary: '#18d6b0',
  primaryDark: '#0fa88a',
  backgroundLight: '#F8FAF8',
  cardDark: '#1C2226',
  pillGreen: '#2B3B36',
  goldAccent: '#E5A93C',
  textSecondary: '#8A969E',
  progressTrack: '#2A3539',
  progressFill: '#2B7A6F',
  danger: '#DC2626',
} as const;
