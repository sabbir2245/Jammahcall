import { useState } from 'react';
import { Pressable, StyleSheet, TextInputProps, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/ThemedTextInput';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function PasswordInput(props: TextInputProps) {
  const [show, setShow] = useState(false);
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <ThemedTextInput {...props} secureTextEntry={!show} style={[props.style, styles.input]} />
      <Pressable onPress={() => setShow((s) => !s)} style={styles.toggle}>
        <ThemedText type="link" style={{ color: theme.primary }}>
          {show ? 'Hide' : 'Show'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
  },
  toggle: {
    position: 'absolute',
    right: Spacing.three,
    zIndex: 1,
  },
});