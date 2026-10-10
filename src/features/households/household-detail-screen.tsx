import { useEffect, useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { Platform, Share, Text } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AuthScreen, authStyles } from '@/features/auth/components/auth-screen';
import { useAuth } from '@/lib/auth-context';
import type { HouseholdInvite } from '@/types/database';
import { createInvite, listInvites, listMembers, renameHousehold, revokeInvite } from './api';
import { householdError, householdSchema, inviteSchema } from './validation';
import { useHouseholds } from './use-households';
function Settings({ id, name }: { id: string; name: string }) {
 const [value, setValue] = useState(name);
 const [error, setError] = useState<string | null>(null);
 const [saved, setSaved] = useState(false);
 const client = useQueryClient();
 const mutation = useMutation({ mutationFn: () => renameHousehold(id, value), retry: false, onSuccess: async () => {
  setSaved(true); await client.invalidateQueries({ queryKey: ['households'] });
 } });
 return <Card style={authStyles.form}><Text accessibilityRole="header" style={authStyles.title}>Settings</Text>
  <Input label="Household name" value={value} onChangeText={v => { setValue(v); setSaved(false); }} maxLength={80} editable={!mutation.isPending} />
  <Text style={authStyles.body}>Currency: MYR (RM)</Text>
  {error ? <Text accessibilityRole="alert" style={authStyles.error}>{error}</Text> : null}
  {saved ? <Text accessibilityLiveRegion="polite" style={authStyles.success}>Household name saved.</Text> : null}
  <Button label="Save name" loading={mutation.isPending} onPress={() => {
   setError(null); if (!householdSchema.safeParse({ name: value }).success) { setError('Enter a name between 1 and 80 characters.'); return; }
   mutation.mutate(undefined, { onError: e => setError(householdError(e)) });
  }} />
 </Card>;
}
function InviteCard({ invite, busy, revoke }: { invite: HouseholdInvite; busy: boolean; revoke: () => void }) {
 const [shareError, setShareError] = useState<string | null>(null);
 const [now, setNow] = useState(() => Date.now());
 useEffect(() => {
  const remaining = Date.parse(invite.expires_at) - now;
  if (remaining <= 0) return;
  const timer = setTimeout(() => setNow(Date.now()), Math.min(remaining + 1, 2147483647));
  return () => clearTimeout(timer);
 }, [invite.expires_at, now]);
 const link = `${Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin + '/join' : 'roomie://join'}?code=${invite.code}`;
 const unavailable = !!invite.revoked_at || Date.parse(invite.expires_at) <= now || invite.use_count >= invite.max_uses;
 const status = invite.revoked_at ? 'Revoked' : Date.parse(invite.expires_at) <= now ? 'Expired' : invite.use_count >= invite.max_uses ? 'Fully used' : 'Active';
 async function share() {
  setShareError(null);
  try {
   if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.clipboard) throw new Error();
    await navigator.clipboard.writeText(link);
    setShareError('Link copied.');
   } else { await Share.share({ message: `Join our Roomie household: ${link}` }); }
  } catch { setShareError('Select and copy the invitation link below.'); }
 }
 return <Card style={authStyles.form}>
  <Text style={authStyles.body}>{status} · {invite.use_count}/{invite.max_uses} uses</Text>
  <Text style={authStyles.body}>Expires {new Date(invite.expires_at).toLocaleString()}</Text>
  {!unavailable ? <>
   <Text selectable accessibilityLabel="Invitation code" style={authStyles.body}>{invite.code}</Text>
   <Text selectable accessibilityLabel="Invitation link" style={authStyles.body}>{link}</Text>
   <Button label={Platform.OS === 'web' ? 'Copy invitation link' : 'Share invitation'} variant="secondary" onPress={() => void share()} />
   {shareError ? <Text accessibilityLiveRegion="polite" style={authStyles.body}>{shareError}</Text> : null}
   <Button label="Revoke invitation" variant="secondary" loading={busy} onPress={revoke} />
  </> : null}
 </Card>;
}
function Invitations({ id, user }: { id: string; user: string }) {
 const client = useQueryClient();
 const [uses, setUses] = useState('5'); const [days, setDays] = useState('7');
 const [error, setError] = useState<string | null>(null);
 const query = useQuery({ queryKey: ['household-invites', user, id], queryFn: () => listInvites(id) });
 const refresh = () => client.invalidateQueries({ queryKey: ['household-invites', user, id] });
 const create = useMutation({ mutationFn: () => createInvite(id, uses, days), retry: false, onSuccess: refresh });
 const revoke = useMutation({ mutationFn: revokeInvite, retry: false, onSuccess: refresh });
 return <>
  <Card style={authStyles.form}><Text accessibilityRole="header" style={authStyles.title}>Invite roommates</Text>
   <Input label="Maximum joins (1–50)" value={uses} onChangeText={setUses} keyboardType="number-pad" editable={!create.isPending} />
   <Input label="Valid for days (1–30)" value={days} onChangeText={setDays} keyboardType="number-pad" editable={!create.isPending} />
   <Button label="Create invitation" loading={create.isPending} onPress={() => {
    setError(null);
    if (!inviteSchema.safeParse({ maxUses: uses, days }).success) { setError('Use a whole number: 1–50 joins and 1–30 days.'); return; }
    create.mutate(undefined, { onError: e => setError(householdError(e)) });
   }} />
   {error ? <Text accessibilityRole="alert" style={authStyles.error}>{error}</Text> : null}
  </Card>
  {query.isPending ? <Text style={authStyles.body}>Loading invitations…</Text> : null}
  {query.isError ? <Card><Text accessibilityRole="alert" style={authStyles.error}>{householdError(query.error)}</Text><Button label="Retry invitations" loading={query.isFetching} onPress={() => void query.refetch()} /></Card> : null}
  {query.isSuccess && !query.data.length ? <Text style={authStyles.body}>No invitations yet.</Text> : null}
  {query.isSuccess ? <Button label="Refresh invitations" variant="secondary" loading={query.isFetching} onPress={() => void query.refetch()} /> : null}
  {query.data?.map(invite => <InviteCard key={invite.id} invite={invite} busy={revoke.isPending} revoke={() => {
   setError(null); revoke.mutate(invite.id, { onError: e => setError(householdError(e)) });
  }} />)}
 </>;
}
export function HouseholdDetailScreen() {
 const { id: param } = useLocalSearchParams<{ id?: string | string[] }>();
 const id = typeof param === 'string' && z.string().uuid().safeParse(param).success ? param : '';
 const { session } = useAuth(); const user = session?.user.id ?? '';
 const houses = useHouseholds();
 const household = houses.houses.find(h => h.id === id);
 const owner = houses.data?.memberships.some(m => m.household_id === id && m.user_id === user && m.role === 'owner');
 const members = useQuery({ queryKey: ['household-members', user, id], queryFn: () => listMembers(id), enabled: !!household && !!user });
 if (!id || houses.isError || (houses.isSuccess && !household)) return <AuthScreen title="Household unavailable." eyebrow="YOUR HOUSEHOLD">
  <Text accessibilityRole="alert" style={authStyles.error}>{houses.isError ? householdError(houses.error) : 'You may no longer be an active member of this household.'}</Text>
  <Button label="Refresh households" loading={houses.isFetching} onPress={() => void houses.refetch()} />
  <Link href="/households" asChild><Button label="Your households" /></Link>
 </AuthScreen>;
 return <AuthScreen title={household?.name ?? 'Loading household…'} eyebrow="MEMBERS AND SETTINGS">
  <Link href="/home" asChild><Button label="Back to home" variant="secondary" /></Link>
  {household ? <>
   <Card style={authStyles.form}><Text accessibilityRole="header" style={authStyles.title}>Members</Text>
    {members.isPending ? <Text style={authStyles.body}>Loading members…</Text> : null}
    {members.isError ? <><Text accessibilityRole="alert" style={authStyles.error}>{householdError(members.error)}</Text><Button label="Retry members" loading={members.isFetching} onPress={() => void members.refetch()} /></> : null}
    {members.data?.map(m => <Text key={m.id} style={authStyles.body}>{m.display_name}{m.user_id === user ? ' (you)' : ''} · {m.role} · {m.status}</Text>)}
    {members.isSuccess ? <Button label="Refresh members" variant="secondary" loading={members.isFetching} onPress={() => void members.refetch()} /> : null}
   </Card>
   {owner ? <><Settings key={id} id={id} name={household.name} /><Invitations id={id} user={user} /></> : <Text style={authStyles.body}>Your household owner manages invitations and settings.</Text>}
   <Text style={authStyles.body}>Leaving, member removal, and ownership transfer will be added with safeguards for household debts and history.</Text>
  </> : null}
 </AuthScreen>;
}
