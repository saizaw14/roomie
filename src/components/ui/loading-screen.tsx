import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/theme/tokens';
export function LoadingScreen({ label = 'Restoring your session…' }: { label?: string }) {
  return <View style={styles.container}>
    <ActivityIndicator color={colors.primary} accessibilityLabel={label} />
    <Text accessibilityLiveRegion="polite" style={styles.text}>{label}</Text>
  </View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.md, justifyContent: 'center', alignItems: 'center' },
  text: { color: colors.muted, fontSize: 16 },
});
