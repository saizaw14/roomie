import { Link } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AuthScreen, authStyles } from '@/features/auth/components/auth-screen';
import { useProfile } from '@/features/profile/use-profile';
import { useAuth } from '@/lib/auth-context';
import { authErrorMessage } from '@/features/auth/error-message';
import { useHouseholds } from './use-households';
import { householdError } from './validation';
import { useInviteIntent } from './invite-intent';
export function HomeScreen() {
  const { session, signOut } = useAuth();
  const profile = useProfile();
  const households = useHouseholds();
  const intent = useInviteIntent();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const name = profile.data?.display_name;
  async function logout() {
    setBusy(true); setError(null);
    try { await signOut(); } catch (failure) { setError(authErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <AuthScreen title={name ? `Hi, ${name}.` : 'Welcome to Roomie.'} eyebrow="YOUR SHARED HOME STARTS HERE">
    <Text style={authStyles.body}>Signed in as {session?.user.email}</Text>
    {profile.isPending ? <Text style={authStyles.body}>Loading your profile…</Text> : null}
    {profile.isError ? <Card>
      <Text accessibilityRole="alert" style={authStyles.error}>Your profile couldn’t be loaded.</Text>
      <Button label="Retry profile" variant="secondary" loading={profile.isFetching} onPress={() => void profile.refetch()} />
    </Card> : null}
    {intent.code ? <Link href={{ pathname: '/join', params: { code: intent.code } }} asChild><Button label="Continue household invitation" /></Link> : null}
    {households.isPending ? <Text style={authStyles.body}>Loading your households…</Text> : null}
    {households.isError ? <Card><Text accessibilityRole="alert" style={authStyles.error}>{householdError(households.error)}</Text><Button label="Retry households" loading={households.isFetching} onPress={() => void households.refetch()} /></Card> : null}
    {households.isSuccess ? <Card>
      <Text accessibilityRole="header" style={authStyles.title}>{households.current?.name ?? 'Room for your household.'}</Text>
      <Text style={authStyles.body}>{households.current ? `${households.current.currency} · ${households.membership?.role ?? 'member'}` : 'Create a household or join your roommates using an invitation.'}</Text>
      {households.current ? <Link href={{ pathname: '/households/[id]', params: { id: households.current.id } }} asChild><Button label="Members and settings" /></Link> : null}
      <Text style={authStyles.body}>Record shared expenses now. Balance summaries and bills arrive in later milestones.</Text>
    </Card> : null}
    <Link href="/expenses" asChild><Button label="View expenses / Add expense" /></Link>
    <Link href="/households" asChild><Button label="Your households / Switch household" variant="secondary" /></Link>
    <Link href="/households/create" asChild><Button label="Create household" /></Link>
    <Link href="/join" asChild><Button label="Join household" variant="secondary" /></Link>
    <Link href="/profile" asChild><Button label={profile.data ? 'View and edit profile' : 'Set up your profile'} /></Link>
    {error ? <Text accessibilityRole="alert" style={authStyles.error}>{error}</Text> : null}
    <Button label="Log out" variant="secondary" loading={busy} onPress={() => void logout()} />
  </AuthScreen>;
}
