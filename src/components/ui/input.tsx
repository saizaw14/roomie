import { useState, useId, type Ref } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { authColors, authFonts } from '@/theme/auth-tokens';
import { colors, radius, spacing } from '@/theme/tokens';
type Props = TextInputProps & { label: string; prefix?: string; containerStyle?: StyleProp<ViewStyle>; appearance?: 'default' | 'auth'; revealable?: boolean; error?: string; hint?: string; ref?: Ref<TextInput> };
export function Input({ label, prefix, containerStyle, appearance = 'default', revealable = false, error, hint, style, ...props }: Props) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const compact = appearance === 'auth';
  return <View style={[styles.container, compact && styles.authContainer, containerStyle]}>
    <Text nativeID={id} style={[styles.label, compact && styles.authLabel]}>{label}</Text>
    <View style={[styles.frame, compact && styles.authFrame, focused && compact && styles.focused, error && styles.invalid]}>
      {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
      <TextInput {...props} secureTextEntry={revealable ? !visible : props.secureTextEntry}
        onFocus={event => { setFocused(true); props.onFocus?.(event); }}
        onBlur={event => { setFocused(false); props.onBlur?.(event); }}
        accessibilityLabel={props.accessibilityLabel ?? label} accessibilityHint={error ?? hint}
        placeholderTextColor={compact ? authColors.placeholder : colors.muted}
        style={[styles.input, compact && styles.authInput, style]} />
      {revealable ? <Pressable accessibilityRole="button" accessibilityLabel={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
        disabled={props.editable === false} onPress={() => setVisible(value => !value)} style={styles.reveal}>
        <Text style={styles.revealText}>{visible ? 'Hide' : 'Show'}</Text>
      </Pressable> : null}
    </View>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> :
      hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  prefix: { marginLeft: 13, color: authColors.muted, fontFamily: authFonts.bold, fontSize: 13 },
  authContainer: { gap: 7, marginBottom: 14 },
  authLabel: { color: authColors.muted, fontFamily: authFonts.semibold, fontWeight: 'normal', fontSize: 11, marginLeft: 2 },
  authFrame: { borderColor: authColors.inputBorder, borderRadius: 12 },
  authInput: { paddingHorizontal: 13, paddingVertical: 0, color: authColors.ink, fontFamily: authFonts.regular, fontSize: 16 },
  focused: { borderColor: authColors.primary, boxShadow: `0 0 0 3px ${authColors.soft}` },
  reveal: { minWidth: 52, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  revealText: { color: authColors.primary, fontFamily: authFonts.bold, fontSize: 10 },
  container: { gap: spacing.sm }, label: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  frame: { overflow: 'hidden', minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface },
  input: { minHeight: 50, flex: 1, minWidth: 0,
    padding: spacing.md, color: colors.ink, backgroundColor: colors.surface, fontSize: 16 },
  invalid: { borderColor: colors.error }, error: { color: colors.error, fontSize: 14 },
  hint: { color: colors.muted, fontSize: 14 },
});
