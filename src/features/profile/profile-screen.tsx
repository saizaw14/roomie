import { useState } from 'react';
import { Link, router } from 'expo-router';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useRoomieFonts } from '@/hooks/use-roomie-fonts';
import { useAuth } from '@/lib/auth-context';
import { authErrorMessage } from '@/features/auth/error-message';
import { useHouseholds } from '@/features/households/use-households';
import { useExpenseMembers } from '@/features/expenses/hooks';
import { useActivity } from '@/features/dashboard/use-activity';
import { DashboardIcon, styles as nav } from '@/features/dashboard/components';
import { ProfileEditor, ProfilePasswordForm } from './profile-forms';
import { MenuCard, MenuRow, ProfileAvatar, ProfileIcon, s } from './profile-ui';
import { useProfile } from './use-profile';

type Panel = 'profile' | 'security' | 'password' | 'members' | 'activity' | 'notifications' | 'bills' | 'logout';
const titles: Record<Panel,string> = {profile:'Profile details',security:'Security',password:'Change password',members:'Household members',activity:'Activity & revisions',notifications:'Notifications',bills:'Bills',logout:'Log out'};
export function ProfileScreen() {
 const [loaded,fontError]=useRoomieFonts();
 const {session,signOut}=useAuth();const profile=useProfile();const houses=useHouseholds();const house=houses.current;
 const members=useExpenseMembers(house?.id??'');
 const [panel,setPanel]=useState<Panel|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState<string|null>(null);const [notice,setNotice]=useState('');
 const activity=useActivity(panel==='activity'?house?.id??'':'',true);const insets=useSafeAreaInsets();
 const name=profile.data?.display_name??'Roomie member';const owner=houses.membership?.role==='owner';
 function open(value:Panel){setError(null);setPanel(value);}
 function close(){if(!busy)setPanel(null);}
 function saved(message:string){setPanel(null);setNotice(message);}
 async function logout(){setBusy(true);setError(null);try{await signOut();}catch(failure){setError(authErrorMessage(failure));}finally{setBusy(false);}}
 if(!loaded&&!fontError)return <LoadingScreen/>;
 return <View style={s.canvas}><SafeAreaView style={s.safe}>
  <ScrollView contentContainerStyle={s.content}>
   <View style={s.head}><ProfileAvatar name={name} uri={profile.data?.avatar_url}/><View style={{flex:1}}><Text style={s.name}>{name}</Text><Text style={s.email}>{session?.user.email}</Text><Text style={s.badge}>{house?owner?'Household owner':'Household member':'Your Roomie account'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Edit profile" disabled={!profile.isSuccess} style={s.iconButton} onPress={()=>open('profile')}><ProfileIcon name="edit"/></Pressable></View>
   {notice?<Text accessibilityLiveRegion="polite" style={s.body}>{notice}</Text>:null}
   {profile.isPending?<Text style={s.body}>Loading your profile…</Text>:profile.isError?<><Text style={s.error} accessibilityRole="alert">We couldn’t load your profile.</Text><Button appearance="auth" label="Retry profile" onPress={()=>void profile.refetch()}/></>:null}
   <Text accessibilityRole="header" style={s.heading}>Household</Text>
   <MenuCard><MenuRow icon="users" title="Members" detail={house?`${houses.data?.memberships.filter(m=>m.household_id===house.id&&m.status==='active').length??0} active members`:'Create or join a household'} onPress={()=>house?open('members'):router.push('/households')}/><MenuRow icon="settings" title="Household settings" detail={house?.name??'Choose your shared home'} onPress={()=>house?router.push({pathname:'/households/[id]',params:{id:house.id}}):router.push('/households')}/><MenuRow icon="history" title="Activity & revisions" detail="Financial change history" onPress={()=>open('activity')}/></MenuCard>
   {houses.isError?<><Text style={s.error}>Your household could not be loaded.</Text><Button appearance="auth" variant="secondary" label="Retry household" onPress={()=>void houses.refetch()}/></>:null}
   <Text accessibilityRole="header" style={s.heading}>Account</Text>
   <MenuCard><MenuRow icon="user" title="Profile details" disabled={!profile.isSuccess} onPress={()=>open('profile')}/><MenuRow icon="shield" title="Security" detail="Password and sessions" onPress={()=>open('security')}/><MenuRow icon="bell" title="Notifications" detail="Bills and payment requests" onPress={()=>open('notifications')}/></MenuCard>
   {house?<View style={s.policy}><ProfileIcon name="shield"/><View style={{flex:1,gap:5}}><Text style={s.bold}>{owner?'Owner permissions':'Household membership'}</Text><Text style={s.body}>{owner?'You can manage invitations and household settings, and edit or void household expenses.':'You can view shared expenses and manage the expenses you created.'}</Text></View></View>:null}
   <Button appearance="auth" label="Log out" variant="secondary" style={s.logout} labelStyle={s.logoutLabel} leadingIcon={<ProfileIcon name="logout" color="#b4232d"/>} onPress={()=>open('logout')}/>
   <Text style={s.version}>Roomie v1.0 · Shared living. Simpler money.</Text>
  </ScrollView>
  <View style={nav.nav}>{([{label:'Home',href:'/home',icon:'home'},{label:'Expenses',href:'/expenses',icon:'receipt'}] as const).map(item=><Link key={item.label} href={item.href} asChild><Pressable accessibilityRole="button" style={nav.navItem}><DashboardIcon name={item.icon} color="#8a929d"/><Text style={nav.navLabel}>{item.label}</Text></Pressable></Link>)}<Pressable accessibilityRole="button" style={nav.navItem} onPress={()=>open('bills')}><DashboardIcon name="calendar" color="#8a929d"/><Text style={nav.navLabel}>Bills</Text></Pressable><View accessibilityRole="tab" accessibilityState={{selected:true}} style={nav.navItem}><View style={nav.indicator}/><DashboardIcon name="user"/><Text style={[nav.navLabel,nav.activeNav]}>Me</Text></View></View>
 </SafeAreaView>
 <Modal visible={panel!==null} transparent animationType="fade" onRequestClose={close}>
  <View style={sheet.overlay}><Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close panel" disabled={busy} onPress={close}/><KeyboardAvoidingView pointerEvents="box-none" behavior={Platform.OS==='ios'?'padding':'height'} style={sheet.keyboard}>
   <View accessibilityViewIsModal style={[sheet.body,{paddingBottom:Math.max(insets.bottom,20),maxHeight:'90%'}]}><View style={sheet.handle}/><View style={sheet.header}><Text accessibilityRole="header" style={s.heading}>{panel?titles[panel]:''}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close panel" disabled={busy} onPress={close} style={s.iconButton}><Text style={s.heading}>×</Text></Pressable></View>
   <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={sheet.content}>
    {panel==='profile'?<ProfileEditor initialName={profile.data?.display_name??''} uri={profile.data?.avatar_url} email={session?.user.email??''} exists={!!profile.data} onBusy={setBusy} onDone={()=>saved('Profile saved.')}/>:null}
    {panel==='password'?<ProfilePasswordForm onBusy={setBusy} onDone={()=>saved('Password updated.')}/>:null}
    {panel==='security'?<><MenuCard><MenuRow icon="shield" title="Password" detail="Choose a new password" onPress={()=>open('password')}/></MenuCard><Text style={s.heading}>Current session</Text><Text style={s.bold}>{session?.user.email}</Text><Text style={s.body}>Signed in on {Platform.OS==='web'?'this browser':'this device'}. Log out to end this session.</Text><Button appearance="auth" label="Log out" variant="secondary" onPress={()=>open('logout')}/></>:null}
    {panel==='members'?<>{members.isPending?<Text style={s.body}>Loading members…</Text>:members.isError?<><Text style={s.error}>Members could not be loaded.</Text><Button appearance="auth" label="Retry" onPress={()=>void members.refetch()}/></>:members.data?.filter(m=>m.status==='active').map(member=><View key={member.id} style={s.timeline}><ProfileAvatar name={member.display_name}/><View><Text style={s.bold}>{member.display_name}</Text><Text style={s.body}>{member.role==='owner'?'Owner':'Member'}</Text></View></View>)}{house&&owner?<Button appearance="auth" label="Manage invitations" onPress={()=>{setPanel(null);router.push({pathname:'/households/[id]',params:{id:house.id}});}}/>:null}</>:null}
    {panel==='activity'?<>{!house?<Text style={s.body}>Join a household to see shared activity.</Text>:activity.isPending?<Text style={s.body}>Loading activity…</Text>:activity.isError?<><Text style={s.error}>Activity could not be loaded.</Text><Button appearance="auth" label="Retry" onPress={()=>void activity.refetch()}/></>:activity.data?.length?activity.data.map(event=><Pressable accessibilityRole="button" key={event.id} style={s.timeline} onPress={()=>{setPanel(null);router.push({pathname:'/expenses/[id]',params:{id:event.entity_id}});}}><ProfileIcon name="history"/><View style={{flex:1}}><Text style={s.bold}>{event.event_type==='expense_created'?'Expense posted':event.event_type==='expense_voided'?'Expense voided':'Expense edited'}</Text><Text style={s.body}>{new Date(event.created_at).toLocaleString()}</Text></View><ProfileIcon name="chevron"/></Pressable>):<Text style={s.body}>Posted, edited, and voided expenses will appear here.</Text>}<Text style={s.body}>Latest 50 changes. Open an expense to see its revision history.</Text></>:null}
    {panel==='notifications'||panel==='bills'?<><ProfileIcon name={panel==='bills'?'building':'bell'}/><Text style={s.heading}>{titles[panel]} coming soon</Text><Text style={s.body}>{panel==='bills'?'Recurring bills and due-date reminders will be available in a future milestone.':'Bill reminders and payment request notifications will be available in a future milestone.'}</Text><Button appearance="auth" label="Got it" onPress={close}/></>:null}
    {panel==='logout'?<><View style={s.center}><ProfileIcon name="logout" color="#b4232d"/><Text style={s.heading}>Leave this session?</Text><Text style={s.body}>Your household and expenses stay saved. Sign in again whenever you’re ready.</Text></View>{error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}<Button appearance="auth" label="Cancel" variant="secondary" disabled={busy} onPress={close}/><Button appearance="auth" label="Log out" style={s.danger} labelStyle={s.logoutLabel} loading={busy} onPress={()=>void logout()}/></>:null}
   </ScrollView></View>
  </KeyboardAvoidingView></View>
 </Modal></View>;
}
const sheet=StyleSheet.create({overlay:{flex:1,backgroundColor:'rgba(10,22,30,0.46)'},keyboard:{flex:1,justifyContent:'flex-end'},body:{width:'100%',maxWidth:430,alignSelf:'center',backgroundColor:'white',borderTopLeftRadius:24,borderTopRightRadius:24},handle:{width:38,height:4,borderRadius:2,backgroundColor:'#d9dfe4',alignSelf:'center',marginTop:10},header:{paddingHorizontal:20,paddingVertical:12,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:1,borderColor:'#e5e9ee'},content:{padding:20,gap:16}});
