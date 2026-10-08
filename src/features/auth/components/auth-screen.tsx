import { Link } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { colors, spacing } from '@/theme/tokens';
export const authStyles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 34, fontWeight: '700', letterSpacing: -1 },
  body: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  error: { color: colors.error, fontSize: 14, lineHeight: 22 },
  success: { color: colors.primary, fontSize: 16, lineHeight: 24 },
  form: { gap: spacing.lg },
});
export function AuthScreen({ title, eyebrow, children }: ViewProps & { title: string; eyebrow: string }) {
  const { issue, configured, retryRestore } = useAuth();
  return <SafeAreaView style={styles.safe}>
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.content}>
          <Link href="/" asChild><Button label="Back to Roomie" variant="secondary" /></Link>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text accessibilityRole="header" style={authStyles.title}>{title}</Text>
          {issue ? <View style={styles.notice}>
            <Text accessibilityRole="alert" style={authStyles.body}>{issue}</Text>
            {configured ? <Button label="Retry saved session" variant="secondary" onPress={retryRestore} /> : null}
          </View> : null}
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.lg },
  content: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: spacing.lg },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1.3 },
  notice: { padding: spacing.md, backgroundColor: colors.soft, borderRadius: 12, gap: spacing.md },
});
