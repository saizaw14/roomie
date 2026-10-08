import { useId, type Ref } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
type Props = TextInputProps & { label: string; error?: string; hint?: string; ref?: Ref<TextInput> };
export function Input({ label, error, hint, style, ...props }: Props) {
  const id = useId();
  return <View style={styles.container}>
    <Text nativeID={id} style={styles.label}>{label}</Text>
    <TextInput {...props} accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityHint={error ?? hint} placeholderTextColor={colors.muted}
      style={[styles.input, error ? styles.invalid : undefined, style]} />
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> :
      hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  container: { gap: spacing.sm }, label: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radius.input,
    padding: spacing.md, color: colors.ink, backgroundColor: colors.surface, fontSize: 16 },
  invalid: { borderColor: colors.error }, error: { color: colors.error, fontSize: 14 },
  hint: { color: colors.muted, fontSize: 14 },
});
