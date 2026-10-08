import { Link, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { colors, radius, spacing, typography } from '@/theme/tokens';

const benefits = [
  ['01', 'Split the everyday', 'From groceries to rent, keep shared costs in one place.'],
  ['02', 'Know where you stand', 'See what you owe and who owes you, without the guesswork.'],
  ['03', 'Stay one step ahead', 'Keep upcoming household bills on your radar.'],
] as const;
export function WelcomeScreen() {
  const [showSample, setShowSample] = useState(false);
  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.content}>
        <View style={styles.brandRow}>
          <View style={styles.mark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Text style={styles.markText}>r.</Text>
          </View>
          <Text style={styles.brand}>roomie</Text>
          <Text style={styles.badge}>MADE FOR SHARED LIVING</Text>
        </View>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>LESS AWKWARD. MORE AT HOME.</Text>
          <Text accessibilityRole="header" style={styles.title}>Shared living.{'\n'}Simpler money.</Text>
          <Text style={styles.intro}>A little clarity for the place you share. Keep expenses, balances, and bills together with Roomie.</Text>
        </View>
        <Card style={styles.featureCard}>
          <Text style={styles.eyebrow}>ONE HOME. EVERYONE ON THE SAME PAGE.</Text>
          {benefits.map(([number, title, detail]) => <View key={number} style={styles.benefit}>
            <View style={styles.number}><Text style={styles.numberText}>{number}</Text></View>
            <View style={styles.benefitCopy}><Text style={styles.heading}>{title}</Text><Text style={styles.body}>{detail}</Text></View>
          </View>)}
        </Card>
        <Button label={showSample ? 'Hide sample household' : 'Explore a sample household'}
          accessibilityState={{ expanded: showSample }} onPress={() => setShowSample(value => !value)} />
        {showSample ? <Card>
          <Text style={styles.sampleBadge}>SAMPLE DATA · PREVIEW ONLY</Text>
          <Text accessibilityRole="header" style={styles.heading}>The Green House</Text>
          <Text style={styles.body}>4 roommates · MYR</Text>
          <View style={styles.balance}>
            <Text style={styles.body}>Alex is owed</Text><Text style={styles.amount}>RM300.00</Text>
            <Text style={styles.body}>Alex paid RM400.00 for groceries, shared equally. Each of the other three roommates owes RM100.00.</Text>
          </View>
          <Text style={styles.heading}>An upcoming bill</Text>
          <Text style={styles.body}>Wi-Fi · RM100.00 · due on the 15th</Text>
          <Text style={styles.note}>This fictional bill has not been posted as an expense and does not affect the sample balance. No account or household has been created.</Text>
        </Card> : null}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Your shared home starts here.</Text>
          <Text style={styles.note}>Create your account and make yourself at home. Household sharing is coming next.</Text>
          <View style={styles.actions}>
            <Button label="Get started" onPress={() => router.push('/signup')} />
            <Link href="/login" asChild>
              <Button label="Sign in" variant="secondary" />
            </Link>
          </View>
          <Text style={styles.currency}>Built for Malaysian households · RM / MYR</Text>
        </View>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.lg, alignItems: 'center' },
  content: { width: '100%', maxWidth: 560, gap: spacing.lg },
  brandRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  mark: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  markText: { color: colors.white, fontSize: 30, fontWeight: '700' },
  brand: { fontSize: 26, fontWeight: '700', color: colors.ink },
  badge: { fontSize: 10, letterSpacing: 1, color: colors.muted, marginLeft: 'auto' },
  hero: { gap: spacing.md, paddingVertical: spacing.lg },
  eyebrow: { fontSize: typography.caption, fontWeight: '700', letterSpacing: 1.3, color: colors.primary },
  title: { fontSize: typography.hero, fontWeight: '700', letterSpacing: -1.5, color: colors.ink, lineHeight: 49 },
  intro: { fontSize: 18, lineHeight: 28, color: colors.muted },
  featureCard: { gap: spacing.lg },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  number: { padding: 10, backgroundColor: colors.soft, borderRadius: radius.input },
  numberText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  benefitCopy: { flex: 1, gap: spacing.xs },
  heading: { color: colors.ink, fontWeight: '600', fontSize: 18 },
  body: { color: colors.muted, fontSize: typography.body, lineHeight: 24 },
  sampleBadge: { color: colors.ink, backgroundColor: colors.accent, padding: spacing.sm, borderRadius: 8, fontSize: 12, fontWeight: '700', alignSelf: 'flex-start' },
  balance: { backgroundColor: colors.soft, borderRadius: radius.input, padding: spacing.md, gap: spacing.sm },
  amount: { color: colors.ink, fontSize: 36, fontWeight: '700' },
  note: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  footer: { gap: spacing.sm, paddingBottom: spacing.lg },
  footerTitle: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  actions: { gap: spacing.sm },
  currency: { color: colors.muted, fontSize: 12, paddingTop: spacing.sm },
});
