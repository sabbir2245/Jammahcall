import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { navigationTheme } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/contexts/auth';
import { ThemeProvider as AppThemeProvider } from '@/contexts/theme';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { loading } = useAuth();
  if (loading) {
    return null;
  }
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  return (
    <ThemeProvider value={navigationTheme(scheme)}>
      <AppThemeProvider>
        <AuthProvider>
          <AnimatedSplashOverlay />
          <RootNavigator />
        </AuthProvider>
      </AppThemeProvider>
    </ThemeProvider>
  );
}