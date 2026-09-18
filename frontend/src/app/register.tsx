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
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/contexts/auth';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = '1023170919208-0d8pfg17mtckqed5e9a1tuh0qlo8r8p1.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = 'YOUR_GOOGLE_IOS_CLIENT_ID';
const GOOGLE_ANDROID_CLIENT_ID = 'YOUR_GOOGLE_ANDROID_CLIENT_ID';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

type Gender = 'male' | 'female';

export default function RegisterScreen() {
  const { user, register, googleLogin } = useAuth();
  const colors = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [genderOpen, setGenderOpen] = useState(false);
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
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
    if (!gender) {
      setError('Please select your gender');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await register({ name, email, password, city, phone, gender });
      router.replace('/');
    } catch (e: any) {
      const data = e?.response?.data;
      const msg =
        typeof data?.detail === 'string'
          ? data.detail
          : Object.values(data ?? {}).flat().join('\n') || 'Registration failed';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const onGoogleSignup = async () => {
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
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <View style={styles.container}>
            <View style={styles.topBar}>
              <ThemedText type="title">Create account</ThemedText>
              <ThemeToggle />
            </View>

            <ThemedTextInput
              placeholder="Name"
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />
            <ThemedTextInput
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <PasswordInput
              placeholder="Password (min 8 chars)"
              value={password}
              onChangeText={setPassword}
            />

            <View>
              <Pressable
                onPress={() => setGenderOpen((o) => !o)}
                accessibilityRole="button"
                style={[
                  styles.dropdownTrigger,
                  { borderColor: colors.border, backgroundColor: colors.inputBackground },
                ]}>
                <ThemedText style={!gender && styles.placeholder}>
                  {gender ? (gender === 'male' ? 'Male' : 'Female') : 'Select gender'}
                </ThemedText>
              </Pressable>
              {genderOpen &&
                (['male', 'female'] as Gender[]).map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => {
                      setGender(g);
                      setGenderOpen(false);
                    }}
                    accessibilityRole="menuitem"
                    style={[
                      styles.dropdownItem,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.inputBackground,
                      },
                    ]}>
                    <ThemedText>{g === 'male' ? 'Male' : 'Female'}</ThemedText>
                  </Pressable>
                ))}
            </View>
            <ThemedTextInput
              placeholder="City (optional)"
              value={city}
              onChangeText={setCity}
            />
            <ThemedTextInput
              placeholder="Phone (optional)"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            {error ? <ThemedText themeColor="textSecondary">{error}</ThemedText> : null}

            <Button title="Sign up" onPress={onSubmit} loading={busy} />

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <ThemedText type="small" themeColor="textSecondary">or</ThemedText>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <Pressable
              onPress={onGoogleSignup}
              disabled={!request || busy}
              style={[styles.googleButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ThemedText style={styles.googleIcon}>G</ThemedText>
              <ThemedText type="default" style={{ color: colors.text }}>Continue with Google</ThemedText>
            </Pressable>

            <Pressable onPress={() => router.replace('/login')}>
              <ThemedText type="link">Already have an account? Log in</ThemedText>
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
  dropdownTrigger: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  dropdownItem: {
    borderWidth: 1,
    borderTopWidth: 0,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
  },
  placeholder: {
    opacity: 0.5,
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
