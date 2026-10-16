import { useEffect, useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { Platform, Share, Text, View, Pressable, StyleSheet } from 'react-native';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { HouseholdSheet, s as sheetStyles } from './household-sheet';
import { DashboardIcon } from '@/features/dashboard/components';
import { authColors as c, authFonts as f } from '@/theme/auth-tokens';
import { currencies } from '@/utils/currencies';
import { useAuth } from '@/lib/auth-context';
import type { HouseholdInvite } from '@/types/database';
import { createInvite, listInvites, listMembers, renameHousehold, revokeInvite } from './api';
import { householdError, householdSchema, inviteSchema } from './validation';
import { useHouseholds } from './use-households';
function Settings({ id, name, currency }: { id: string; name: string; currency: string }) {
 const [value, setValue] = useState(name);
 const [error, setError] = useState<string | null>(null);
 const [saved, setSaved] = useState(false);
 const client = useQueryClient();
 const mutation = useMutation({ mutationKey: ['household-settings', id], mutationFn: () => renameHousehold(id, value), retry: false, onSuccess: async () => {
  setSaved(true); await client.invalidateQueries({ queryKey: ['households'] });
 } });
 return <Card style={styles.form}>
  <Input appearance="auth" label="Household name" value={value} onChangeText={v => { setValue(v); setSaved(false); }} maxLength={80} editable={!mutation.isPending} />
  <Input appearance="auth" label="Currency" value={`${currency} · ${currencies.find(item=>item.code===currency)?.name??currency}`} editable={false}/><Text style={styles.small}>Applies to the whole household. Currency is fixed after creation.</Text>
  {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  {saved ? <Text accessibilityLiveRegion="polite" style={styles.success}>Household name saved.</Text> : null}
  <Button appearance="auth" label="Save changes" loading={mutation.isPending} onPress={() => {
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
 return <Card style={styles.form}>
  <Text style={styles.body}>{status} · {invite.use_count}/{invite.max_uses} uses</Text>
  <Text style={styles.body}>Expires {new Date(invite.expires_at).toLocaleString()}</Text>
  {!unavailable ? <>
   <Text style={styles.small}>Invite code</Text><Text selectable accessibilityLabel="Invitation code" style={styles.code}>{invite.code}</Text>
   <Text selectable accessibilityLabel="Invitation link" style={styles.body}>{link}</Text>
   <Button appearance="auth" label={Platform.OS === 'web' ? 'Copy invitation link' : 'Share invitation'} variant="secondary" onPress={() => void share()} />
   {shareError ? <Text accessibilityLiveRegion="polite" style={styles.body}>{shareError}</Text> : null}
   <Button appearance="auth" label="Revoke invitation" variant="secondary" loading={busy} onPress={revoke} />
  </> : null}
 </Card>;
}
function Invitations({ id, user }: { id: string; user: string }) {
 const client = useQueryClient();
 const [uses, setUses] = useState('5'); const [days, setDays] = useState('7');
 const [error, setError] = useState<string | null>(null);
 const query = useQuery({ queryKey: ['household-invites', user, id], queryFn: () => listInvites(id) });
 const refresh = () => client.invalidateQueries({ queryKey: ['household-invites', user, id] });
 const create = useMutation({ mutationKey: ['household-settings', id], mutationFn: () => createInvite(id, uses, days), retry: false, onSuccess: refresh });
 const revoke = useMutation({ mutationKey: ['household-settings', id], mutationFn: revokeInvite, retry: false, onSuccess: refresh });
 return <>
  <Text accessibilityRole="header" style={styles.title}>Invitation</Text><Card style={styles.form}><Text style={styles.bold}>Invite a member</Text><Text style={styles.small}>Choose how long your invitation stays active and how many roommates can join.</Text>
   <Input appearance="auth" label="Maximum joins (1–50)" value={uses} onChangeText={setUses} keyboardType="number-pad" editable={!create.isPending} />
   <Input appearance="auth" label="Valid for days (1–30)" value={days} onChangeText={setDays} keyboardType="number-pad" editable={!create.isPending} />
   <Button appearance="auth" label="Create invitation" loading={create.isPending} onPress={() => {
    setError(null);
    if (!inviteSchema.safeParse({ maxUses: uses, days }).success) { setError('Use a whole number: 1–50 joins and 1–30 days.'); return; }
    create.mutate(undefined, { onError: e => setError(householdError(e)) });
   }} />
   {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </Card>
  {query.isPending ? <Text style={styles.body}>Loading invitations…</Text> : null}
  {query.isError ? <Card><Text accessibilityRole="alert" style={styles.error}>{householdError(query.error)}</Text><Button appearance="auth" label="Retry invitations" loading={query.isFetching} onPress={() => void query.refetch()} /></Card> : null}
  {query.isSuccess && !query.data.length ? <Text style={styles.body}>No invitations yet.</Text> : null}
  {query.isSuccess ? <Button appearance="auth" label="Refresh invitations" variant="secondary" loading={query.isFetching} onPress={() => void query.refetch()} /> : null}
  {query.data?.map(invite => <InviteCard key={invite.id} invite={invite} busy={revoke.isPending} revoke={() => {
   setError(null); revoke.mutate(invite.id, { onError: e => setError(householdError(e)) });
  }} />)}
 </>;
}
export function HouseholdDetailScreen() {
 const { id: param, view } = useLocalSearchParams<{ id?: string | string[]; view?: string }>();
 const id = typeof param === 'string' && z.string().uuid().safeParse(param).success ? param : '';
 const { session } = useAuth(); const user = session?.user.id ?? '';
 const houses = useHouseholds();
 const household = houses.houses.find(h => h.id === id);
 const owner = houses.data?.memberships.some(m => m.household_id === id && m.user_id === user && m.role === 'owner' && m.status==='active');
 const [tab,setTab]=useState<'members'|'settings'>(view==='settings'?'settings':'members');
 const members = useQuery({ queryKey: ['household-members', user, id], queryFn: () => listMembers(id), enabled: !!household && !!user });
 const busy=useIsMutating({mutationKey:['household-settings',id]})>0;
 const active=members.data?.filter(m=>m.status==='active')??[];
 const ended=members.data?.filter(m=>m.status!=='active')??[];
 if (!id || houses.isError || (houses.isSuccess && !household)) return <HouseholdSheet title="Household unavailable" subtitle="Your shared home">
  <Text accessibilityRole="alert" style={styles.error}>{houses.isError ? householdError(houses.error) : 'You may no longer be an active member of this household.'}</Text>
  <Button appearance="auth" label="Refresh households" loading={houses.isFetching} onPress={() => void houses.refetch()} />
  <Link href="/households" asChild><Button appearance="auth" label="Your households" /></Link>
 </HouseholdSheet>;
 return <HouseholdSheet busy={busy} title={tab==='members'?'Household members':'Household settings'} subtitle={tab==='members'?`${household?.name??'Loading household…'}${members.isSuccess?` · ${active.length} active`:''}`:owner?'Owner controls':'Your household details'}>
  <View style={styles.tabs}>{(['members','settings'] as const).map(value=><Pressable key={value} disabled={busy} accessibilityRole="tab" accessibilityState={{selected:tab===value,disabled:busy}} onPress={()=>setTab(value)} style={[styles.tab,tab===value&&styles.selected]}><Text style={[styles.tabLabel,tab===value&&{color:c.primary}]}>{value==='members'?'Members':'Settings'}</Text></Pressable>)}</View>
  {household ? tab==='members'?<>
    {members.isPending ? <Text style={styles.body}>Loading members…</Text> : null}
    {members.isError ? <><Text accessibilityRole="alert" style={styles.error}>{householdError(members.error)}</Text><Button appearance="auth" label="Retry members" loading={members.isFetching} onPress={() => void members.refetch()} /></> : null}
    {active.length?<View style={styles.members}>{active.map((m,index)=><View key={m.id} style={[styles.member,index>0&&styles.divider]}><View style={[styles.avatar,{backgroundColor:tones[index%tones.length][0]}]}><Text style={[styles.initials,{color:tones[index%tones.length][1]}]}>{m.display_name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()}</Text></View><View style={{flex:1,gap:4}}><Text style={styles.memberName}>{m.display_name}{m.user_id===user?' (you)':''}</Text><Text style={styles.small}>{m.role==='owner'?'Owner':'Member'}</Text></View>{m.role==='owner'?<Text style={styles.badge}>Owner</Text>:null}</View>)}</View>:null}
    {members.isSuccess&&!active.length?<Text style={styles.body}>No active members found. Refresh to check your membership.</Text>:null}
    {owner?<Button appearance="auth" label="Invite a member" leadingIcon={<DashboardIcon name="plus" color="white"/>} onPress={()=>setTab('settings')}/>:<Text style={styles.body}>Your household owner manages invitations.</Text>}
    {ended.length?<><Text style={styles.title}>Past members</Text><Card style={styles.form}>{ended.map(m=><Text key={m.id} style={styles.small}>{m.display_name} · Membership ended</Text>)}</Card></>:null}
    <Button appearance="auth" label="Refresh members" variant="secondary" loading={members.isFetching} onPress={()=>void members.refetch()}/>
  </>:<>
   {owner?<><Settings key={id} id={id} name={household.name} currency={household.currency}/><Invitations key={`invites-${id}`} id={id} user={user}/></>:<Card style={styles.form}><Input appearance="auth" label="Household name" value={household.name} editable={false}/><Input appearance="auth" label="Currency" value={`${household.currency} · ${currencies.find(item=>item.code===household.currency)?.name??household.currency}`} editable={false}/><Text style={styles.body}>Your household owner manages invitations and settings.</Text></Card>}
   <Text style={styles.title}>Ownership</Text><View style={styles.policy}><DashboardIcon name="shield"/><View style={{flex:1,gap:5}}><Text style={styles.bold}>{owner?'You are the owner':'You are a member'}</Text><Text style={styles.small}>Leaving, member removal, and ownership transfer will be available with safeguards for household balances and history.</Text></View></View>
  </>:<Text style={styles.body}>Loading household…</Text>}
 </HouseholdSheet>;
}
const tones=[['#e7f5f2','#0f766e'],['#e9f2fe','#3568a8'],['#fff1d7','#a56113'],['#f1eafe','#714db2']];
const styles=StyleSheet.create({
 form:{padding:14,borderRadius:15,borderColor:c.line,gap:14}, title:{fontFamily:f.bold,color:c.ink,fontSize:17,letterSpacing:-0.3}, body:sheetStyles.text,error:sheetStyles.error,success:{...sheetStyles.text,color:c.primary},small:{fontFamily:f.regular,fontSize:10,lineHeight:16,color:c.muted},bold:{fontFamily:f.semibold,fontSize:12,color:c.ink},code:{fontFamily:f.bold,fontSize:14,letterSpacing:0.5,color:c.ink},tabs:{flexDirection:'row',padding:4,borderRadius:12,backgroundColor:'#e9edf0'},tab:{flex:1,minHeight:40,alignItems:'center',justifyContent:'center',borderRadius:9},selected:{backgroundColor:'white'},tabLabel:{fontFamily:f.semibold,fontSize:12,color:c.muted},members:{backgroundColor:'white',borderWidth:1,borderColor:c.line,borderRadius:16,overflow:'hidden'},member:{minHeight:65,paddingVertical:9,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:11},divider:{borderTopWidth:1,borderColor:c.line},avatar:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center'},initials:{fontFamily:f.extra,fontSize:11},memberName:{fontFamily:f.bold,fontSize:11,color:c.ink},badge:{fontFamily:f.bold,fontSize:9,lineHeight:22,paddingHorizontal:8,borderRadius:10,backgroundColor:'#eaf3fb',color:'#2964a3'},policy:{flexDirection:'row',gap:11,padding:15,borderWidth:1,borderStyle:'dashed',borderColor:'#cbd5dc',borderRadius:15,marginBottom:14},
});
