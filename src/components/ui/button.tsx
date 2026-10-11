import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { authColors, authFonts } from '@/theme/auth-tokens';
import { colors, radius } from '@/theme/tokens';

type Props = Omit<PressableProps, 'children'> & {
  label: string;
  appearance?: 'default' | 'auth';
  loading?: boolean;
  variant?: 'primary' | 'secondary';
};
export function Button({ label, appearance = 'default', loading = false, disabled, variant = 'primary', style, ...props }: Props) {
  const unavailable = disabled || loading;
  return (
    <Pressable {...props} accessibilityRole="button" accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityState={{ ...props.accessibilityState, disabled: !!unavailable, busy: loading }} disabled={unavailable}
      style={(state) => [styles.base, appearance === 'auth' && styles.auth, variant === 'secondary' && styles.secondary,
        state.pressed && styles.pressed, unavailable && styles.disabled,
        typeof style === 'function' ? style(state) : style]}>
      {loading ? <ActivityIndicator color={variant === 'primary' ? colors.white : colors.ink} /> :
        <Text style={[styles.label, appearance === 'auth' && styles.authLabel, variant === 'secondary' && styles.secondaryLabel]}>{label}</Text>}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  auth: { minHeight: 50, borderRadius: 13, paddingVertical: 12, backgroundColor: authColors.primary },
  authLabel: { fontFamily: authFonts.bold, fontSize: 14, fontWeight: 'normal' },
  base: { minHeight: 52, paddingHorizontal: 24, paddingVertical: 14, borderRadius: radius.input,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: colors.soft }, label: { color: colors.white, fontSize: 16, fontWeight: '600' },
  secondaryLabel: { color: colors.ink }, pressed: { opacity: 0.8 }, disabled: { opacity: 0.5 },
});
