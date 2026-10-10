import { useState } from 'react';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AuthScreen, authStyles } from '@/features/auth/components/auth-screen';
import { useAuth } from '@/lib/auth-context';
import { joinHousehold } from './api';
import { householdError, invitationCode } from './validation';
import { useInviteIntent } from './invite-intent';
export function JoinHouseholdScreen() {
 const { session, recovering } = useAuth();
 const { code: param } = useLocalSearchParams<{ code?: string | string[] }>();
 const intent = useInviteIntent();
 const [input, setInput] = useState<string | null>(null);
 const [error, setError] = useState<string | null>(null);
 const code = input ?? (Array.isArray(param) ? '' : param ?? intent.code ?? '');
 const client = useQueryClient();
 const mutation = useMutation({ mutationFn: joinHousehold, retry: false, onSuccess: async id => {
  intent.remember(null);
  client.setQueryData(['household-selection', session?.user.id], id);
  await client.invalidateQueries({ queryKey: ['households'] });
  router.replace('/home');
 } });
 const canJoin = !!session && !recovering;
 async function submit() {
  setError(null);
  try {
   const normalized = invitationCode(code);
   if (!canJoin) { intent.remember(normalized); router.push(recovering ? '/reset-password' : '/login'); return; }
   await mutation.mutateAsync(normalized);
  } catch (e) { setError(householdError(e)); }
 }
 return <AuthScreen title="Join your roommates." eyebrow="HOUSEHOLD INVITATION"><Card style={authStyles.form}>
  <Text style={authStyles.body}>Paste an invitation code or link from your household owner. Joining requires a signed-in account.</Text>
  <Input label="Invitation code or link" value={code} onChangeText={setInput} autoCapitalize="none" autoCorrect={false} editable={!mutation.isPending} />
  {error ? <Text accessibilityRole="alert" style={authStyles.error}>{error}</Text> : null}
  <Button label={canJoin ? 'Join household' : recovering ? 'Finish password recovery' : 'Sign in to join'} loading={mutation.isPending} onPress={() => void submit()} />
  {!session ? <Text style={authStyles.body}>Your invitation stays available during login in this app session. If you reload or switch devices, open the invitation link again after signing in.</Text> : null}
 </Card><Link href={session ? '/home' : '/'} asChild><Button label="Back" variant="secondary" /></Link></AuthScreen>;
}
