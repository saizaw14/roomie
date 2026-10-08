import { Link } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AuthScreen, authStyles } from '@/features/auth/components/auth-screen';
import { useProfile } from '@/features/profile/use-profile';
import { useAuth } from '@/lib/auth-context';
import { authErrorMessage } from '@/features/auth/error-message';
export function HomeScreen() {
  const { session, signOut } = useAuth();
  const profile = useProfile();
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
    <Card>
      <Text accessibilityRole="header" style={authStyles.title}>Room for your household.</Text>
      <Text style={authStyles.body}>Your account is ready. Creating and joining households is the next step we’re building.</Text>
      <Text style={authStyles.body}>Balances, bills, and repayments will appear once household features are available.</Text>
    </Card>
    <Link href="/profile" asChild><Button label={profile.data ? 'View and edit profile' : 'Set up your profile'} /></Link>
    {error ? <Text accessibilityRole="alert" style={authStyles.error}>{error}</Text> : null}
    <Button label="Log out" variant="secondary" loading={busy} onPress={() => void logout()} />
  </AuthScreen>;
}
