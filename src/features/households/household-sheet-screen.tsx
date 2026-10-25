import { palette as appPalette } from '@/theme/palette';
import { useEffect,useRef,useState } from 'react';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import {StyleSheet,Text,View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { useMutation,useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DashboardIcon } from '@/features/dashboard/components';
import { CurrencySelector } from './currency-selector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormInput } from '@/features/auth/components/form-input';
import { useAuth } from '@/lib/auth-context';
import { useHouseholds } from './use-households';
import { createHousehold,joinHousehold } from './api';
import { householdSchema,householdError,invitationCode } from './validation';
import { useInviteIntent } from './invite-intent';
import { HouseholdSheet,closeHouseholdSheet,s } from './household-sheet';
type Mode='switch'|'create'|'join';
export function HouseholdSheetScreen({initialView='switch',initialCode=''}:{initialView?:Mode;initialCode?:string}) {
 useHouseholds(); // Register account-scoped household data for direct modal/deep-link entry.
 const [mode,setMode]=useState<Mode>(initialView);const {session}=useAuth();
 if(mode==='create')return <CreateForm onBack={()=>setMode('switch')}/>;
 if(mode==='join')return <JoinForm initialCode={initialCode} onBack={session?()=>setMode('switch'):undefined}/>;
 return <SwitchForm onCreate={()=>setMode('create')} onJoin={()=>setMode('join')}/>;
}
function SwitchForm({onCreate,onJoin}:{onCreate:()=>void;onJoin:()=>void}) {
 const query=useHouseholds();
 return <HouseholdSheet title="Switch household" subtitle="Balances are never mixed between homes">
  {query.isPending?<Text style={s.text}>Loading your households…</Text>:null}
  {query.isError?<><Text accessibilityRole="alert" style={s.error}>{householdError(query.error)}</Text><Button appearance="auth" label="Retry" loading={query.isFetching} onPress={()=>void query.refetch()}/></>:null}
  {query.isSuccess&&!query.houses.length?<Text style={s.text}>Create your first household or join your roommates with an invitation.</Text>:null}
  {query.houses.map(h=>{
   const selected=h.id===query.current?.id;const count=query.data?.memberships.filter(m=>m.household_id===h.id&&m.status==='active').length??0;
   return <Pressable key={h.id} accessibilityRole="button" accessibilityLabel={`Switch to ${h.name}`} accessibilityState={{selected}} onPress={()=>{query.select(h.id);closeHouseholdSheet(true);}} style={[s.option,selected&&s.selected]}>
    <View style={s.icon}><Image source={require('../../../assets/images/dashboard/building.svg')} style={{width:20,height:20}}/></View><View style={{flex:1,gap:4}}><Text style={s.bold}>{h.name}</Text><Text style={s.text}>{count} {count===1?'member':'members'} · {h.currency}{selected?' · Selected':''}</Text></View>
    {selected?<Image source={require('../../../assets/images/expenses/check.svg')} style={{width:20,height:20}}/>:null}
   </Pressable>;
  })}
  <View style={s.actions}><Button appearance="auth" variant="secondary" label="Join household" leadingIcon={<DashboardIcon name="plus"/>} style={StyleSheet.flatten([s.action,s.secondary])} labelStyle={s.secondaryLabel} onPress={onJoin}/><Button appearance="auth" label="Create household" style={s.action} onPress={onCreate}/></View>
 </HouseholdSheet>;
}
function CreateForm({onBack}:{onBack:()=>void}) {
 const {session}=useAuth();const client=useQueryClient();const [error,setError]=useState<string|null>(null);
 const lock=useRef(false);const active=useRef(true);
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 const [currency,setCurrency]=useState('');
 const form=useForm<z.infer<typeof householdSchema>>({resolver:zodResolver(householdSchema),defaultValues:{name:''}});
 const mutation=useMutation({mutationFn:(name:string)=>createHousehold(name,currency),retry:false,onSuccess:async id=>{
  if(!client.getQueryState(['households',session?.user.id]))return;
  if(!active.current){await client.invalidateQueries({queryKey:['households']});return;}
  client.setQueryData(['household-selection',session?.user.id],id);
  await client.invalidateQueries({queryKey:['households']});if(active.current)closeHouseholdSheet(true);
 }});
 async function submit(){if(lock.current)return;lock.current=true;setError(null);try{await form.handleSubmit(async values=>{if(!currency){setError('Choose a household currency.');return;}await mutation.mutateAsync(values.name);})();}catch(failure){if(active.current)setError(householdError(failure));}finally{lock.current=false;}}
 return <HouseholdSheet title="Create household" subtitle="You’ll become the household owner" busy={mutation.isPending} onBack={onBack}>
  <FormInput appearance="auth" control={form.control} name="name" label="Household name" placeholder="e.g. Sunway Apartment" maxLength={80} autoCapitalize="words" editable={!mutation.isPending} returnKeyType="done" onSubmitEditing={()=>{if(!mutation.isPending)void submit();}}/>
  <CurrencySelector value={currency} onChange={value=>{setCurrency(value);setError(null);}} disabled={mutation.isPending}/>
  <View style={s.info}><Image source={require('../../../assets/images/dashboard/shield.svg')} style={{width:20,height:20}} tintColor={appPalette.info}/><Text style={s.infoText}>Owners manage invitations and household-wide settings.</Text></View>
  {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
  <Button appearance="auth" label="Create household" disabled={!currency} loading={mutation.isPending} onPress={()=>void submit()}/>
 </HouseholdSheet>;
}
function JoinForm({initialCode,onBack}:{initialCode:string;onBack?:()=>void}) {
 const {session,recovering}=useAuth();const intent=useInviteIntent();const client=useQueryClient();
 const lock=useRef(false);const active=useRef(true);
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 const [code,setCode]=useState(initialCode||intent.code||'');const [error,setError]=useState<string|null>(null);
 const mutation=useMutation({mutationFn:joinHousehold,retry:false,onSuccess:async id=>{
  if(!client.getQueryState(['households',session?.user.id]))return;
  if(!active.current){await client.invalidateQueries({queryKey:['households']});return;}
  intent.remember(null);client.setQueryData(['household-selection',session?.user.id],id);
  await client.invalidateQueries({queryKey:['households']});if(active.current)closeHouseholdSheet(true);
 }});
 const canJoin=!!session&&!recovering;
 async function submit(){if(lock.current)return;lock.current=true;setError(null);try{
  const normalized=invitationCode(code);
  if(!canJoin){intent.remember(normalized);router.replace(recovering?'/reset-password':'/login');return;}
  await mutation.mutateAsync(normalized);
 }catch(failure){if(active.current)setError(householdError(failure));}finally{lock.current=false;}}
 return <HouseholdSheet title="Join household" subtitle="Enter an invitation from an owner" busy={mutation.isPending} onBack={onBack}>
  <Input appearance="auth" label="Invitation code or link" placeholder="Paste the full code or invitation link" value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} editable={!mutation.isPending} returnKeyType="go" onSubmitEditing={()=>void submit()}/>
  <View style={s.info}><Image source={require('../../../assets/images/dashboard/building.svg')} style={{width:20,height:20}} tintColor={appPalette.info}/><Text style={s.infoText}>Enter the full 32-character code or link shared by your household owner. Joining adds your account to that household.</Text></View>
  {!canJoin?<Text style={s.text}>Sign in to continue. Your invitation stays available during this app session; reopen its link after a reload.</Text>:null}
  {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
  <Button appearance="auth" label={canJoin?'Join household':recovering?'Finish password recovery':'Sign in to join'} loading={mutation.isPending} onPress={()=>void submit()}/>
 </HouseholdSheet>;
}
