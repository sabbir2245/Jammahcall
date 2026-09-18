import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Pressable, PressableProps, StyleProp, StyleSheet, TextStyle, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'danger' | 'secondary';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  title: string;
  variant?: Variant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({ title, variant = 'primary', loading, disabled, style, textStyle, ...rest }: ButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const backgroundColor =
    variant === 'danger' ? theme.danger : variant === 'secondary' ? theme.backgroundSelected : theme.primary;
  const textColor = variant === 'secondary' ? theme.text : theme.primaryContrast;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => { scale.value = withSpring(0.96, { damping: 15, stiffness: 400 }); };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 15, stiffness: 400 }); };

  return (
    <AnimatedPressable
      disabled={disabled || loading}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.button,
        { backgroundColor },
        animatedStyle,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      {...rest}>
      <ThemedText type="smallBold" style={[{ color: textColor }, textStyle]}>
        {loading ? 'Loading...' : title}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    padding: Spacing.three,
    alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
});
