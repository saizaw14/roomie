import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { colors, radius } from '@/theme/tokens';

type Props = Omit<PressableProps, 'children'> & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
};
export function Button({ label, loading = false, disabled, variant = 'primary', style, ...props }: Props) {
  const unavailable = disabled || loading;
  return (
    <Pressable {...props} accessibilityRole="button" accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityState={{ ...props.accessibilityState, disabled: !!unavailable, busy: loading }} disabled={unavailable}
      style={(state) => [styles.base, variant === 'secondary' && styles.secondary,
        state.pressed && styles.pressed, unavailable && styles.disabled,
        typeof style === 'function' ? style(state) : style]}>
      {loading ? <ActivityIndicator color={variant === 'primary' ? colors.white : colors.ink} /> :
        <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>{label}</Text>}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  base: { minHeight: 52, paddingHorizontal: 24, paddingVertical: 14, borderRadius: radius.input,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: colors.soft }, label: { color: colors.white, fontSize: 16, fontWeight: '600' },
  secondaryLabel: { color: colors.ink }, pressed: { opacity: 0.8 }, disabled: { opacity: 0.5 },
});
