import { Platform } from 'react-native';

/**
 * Backend API base URL.
 * - Web: use localhost.
 * - Native (Expo Go on a phone): cannot reach "localhost" on your computer, so
 *   set API_URL to your machine's LAN IP, e.g. http://192.168.1.20:8000.
 *   Run the Django backend on 0.0.0.0:8000 and add the IP to CORS_ALLOWED_ORIGINS.
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'web'
    ? 'http://localhost:8000'
    : 'http://localhost:8000');

export const AUTH_TOKEN_KEY = 'auth_tokens';