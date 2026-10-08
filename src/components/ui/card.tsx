import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
export function Card({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.card, style]} />;
}
const styles = StyleSheet.create({ card: { backgroundColor: colors.surface, borderRadius: radius.card,
  borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md } });
