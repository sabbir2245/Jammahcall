import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/contexts/theme';

export function ThemeToggle() {
  const { toggle, preference } = useThemePreference();
  const colors = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${preference === 'dark' ? 'light' : 'dark'} mode`}
      onPress={toggle}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.7 : 1 },
      ]}>
      <ThemedText style={styles.icon}>{preference === 'dark' ? '☀️' : '🌙'}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
});
