import { Redirect, router } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { PasswordInput } from '@/components/PasswordInput';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/ThemedTextInput';
import { ThemedView } from '@/components/themed-view';
import { ThemeToggle } from '@/components/theme-toggle';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/hooks/use-theme';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = '1023170919208-0d8pfg17mtckqed5e9a1tuh0qlo8r8p1.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = 'YOUR_GOOGLE_IOS_CLIENT_ID';
const GOOGLE_ANDROID_CLIENT_ID = 'YOUR_GOOGLE_ANDROID_CLIENT_ID';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export default function LoginScreen() {
  const { user, login, googleLogin } = useAuth();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_WEB_CLIENT_ID,
      scopes: ['openid', 'email', 'profile'],
      redirectUri: AuthSession.makeRedirectUri({
        scheme: 'jamatcall',
        path: 'google-auth',
      }),
    },
    discovery,
  );

  if (user) {
    return <Redirect href="/" />;
  }

  const onSubmit = async () => {
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const networkMsg = e?.message;
      console.error('[login] error', e);
      setError(detail ?? (networkMsg ? `Network error: ${networkMsg}` : 'Login failed'));
    } finally {
      setBusy(false);
    }
  };

  const onGoogleLogin = async () => {
    setError('');
    try {
      const result = await promptAsync();
      if (result.type === 'success' && result.authentication?.idToken) {
        setBusy(true);
        await googleLogin(result.authentication.idToken);
        router.replace('/');
      } else if (result.type === 'error') {
        setError('Google sign-in was cancelled or failed.');
      }
    } catch (e: any) {
      setError(e?.message || 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={[styles.flex, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <View style={styles.container}>
            <View style={styles.topBar}>
              <ThemedText type="title" style={{ color: theme.primary }}>Jama'at</ThemedText>
              <ThemeToggle />
            </View>
            <ThemedText themeColor="textSecondary">
              Find Muslims. Form a Jama'ah. Pray together.
            </ThemedText>

            <ThemedTextInput
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <PasswordInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
            />

            {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}

            <Button title="Log in" onPress={onSubmit} loading={busy} />

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <ThemedText type="small" themeColor="textSecondary">or</ThemedText>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            <Pressable
              onPress={onGoogleLogin}
              disabled={!request || busy}
              style={[styles.googleButton, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <ThemedText style={styles.googleIcon}>G</ThemedText>
              <ThemedText type="default" style={{ color: theme.text }}>Continue with Google</ThemedText>
            </Pressable>

            <Pressable onPress={() => router.push('/register')}>
              <ThemedText type="link">Don't have an account? Sign up</ThemedText>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
});
