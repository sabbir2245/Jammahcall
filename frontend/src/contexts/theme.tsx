import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance } from 'react-native';

export type ThemePreference = 'light' | 'dark';

const THEME_KEY = 'app.theme_preference';

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [preference, setPreferenceState] = useState<ThemePreference>('light');

  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(THEME_KEY);
        if (stored === 'light' || stored === 'dark') {
          setPreferenceState(stored);
          Appearance.setColorScheme(stored);
        }
      } catch {
        // ignore storage failures, fall back to system
      }
    })();
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    Appearance.setColorScheme(p);
    SecureStore.setItemAsync(THEME_KEY, p).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setPreference(preference === 'dark' ? 'light' : 'dark');
  }, [preference, setPreference]);

  const value = useMemo(
    () => ({ preference, setPreference, toggle }),
    [preference, setPreference, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemePreference must be used within a ThemeProvider');
  }
  return ctx;
}
