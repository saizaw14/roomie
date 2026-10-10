import { Link, router } from 'expo-router';
import { Text } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AuthScreen, authStyles } from '@/features/auth/components/auth-screen';
import { useHouseholds } from './use-households';
import { householdError } from './validation';
export function HouseholdListScreen() {
 const households = useHouseholds();
 return <AuthScreen title="Your households." eyebrow="FIND YOUR SHARED HOME">
  {households.isPending ? <Text style={authStyles.body}>Loading households…</Text> : null}
  {households.isError ? <Card><Text accessibilityRole="alert" style={authStyles.error}>{householdError(households.error)}</Text><Button label="Retry" loading={households.isFetching} onPress={() => void households.refetch()} /></Card> : null}
  {households.isSuccess && !households.houses.length ? <Card><Text style={authStyles.body}>Create your first household or join your roommates with an invitation.</Text></Card> : null}
  {households.isSuccess ? <Button label="Refresh households" variant="secondary" loading={households.isFetching} onPress={() => void households.refetch()} /> : null}
  {households.houses.map(h => <Card key={h.id}>
   <Text accessibilityRole="header" style={authStyles.title}>{h.name}</Text>
   <Text style={authStyles.body}>{h.currency} · {h.id === households.current?.id ? 'Selected household' : 'Household'}</Text>
   <Button label={`Open ${h.name}`} onPress={() => { households.select(h.id); router.replace('/home'); }} />
  </Card>)}
  <Link href="/households/create" asChild><Button label="Create household" /></Link>
  <Link href="/join" asChild><Button label="Join household" variant="secondary" /></Link>
  <Link href="/home" asChild><Button label="Back to home" variant="secondary" /></Link>
 </AuthScreen>;
}
