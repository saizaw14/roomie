import { Link } from 'expo-router';
import { Image } from 'expo-image';
import { useRef,useState } from 'react';
import { Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useRoomieFonts } from '@/hooks/use-roomie-fonts';
import { useProfile } from '@/features/profile/use-profile';
import { useExpenses,useExpenseMembers } from '@/features/expenses/hooks';
import { expenseError } from '@/features/expenses/validation';
import { money as formatMoney,safeMinor } from '@/features/expenses/domain';
import { expenseSummary } from '@/features/dashboard/summary';
import { useActivity } from '@/features/dashboard/use-activity';
import { DashboardCard,DashboardIcon,styles as s } from '@/features/dashboard/components';
import { useHouseholds } from './use-households';
import { householdError } from './validation';
import { useInviteIntent } from './invite-intent';
import type { ActivityEvent } from '@/types/database';

export function HomeScreen() {
 const [loaded,fontError]=useRoomieFonts();
 const profile=useProfile();const houses=useHouseholds();const intent=useInviteIntent();
 const house=houses.current;const expenses=useExpenses(house?.id??'');const members=useExpenseMembers(house?.id??'');
 const [expanded,setExpanded]=useState(false);const activity=useActivity(house?.id??'',expanded);
 const scroll=useRef<ScrollView>(null);
 const [notice,setNotice]=useState<'bills'|'notifications'|'settle'|null>(null);
 function openNotice(value:'bills'|'notifications'|'settle'){setNotice(value);scroll.current?.scrollTo({y:0,animated:true});}
 let summary:ReturnType<typeof expenseSummary>|null=null;let balanceError:string|null=null;
 if(expenses.isSuccess&&houses.membership)try{summary=expenseSummary(expenses.data,houses.membership.id);}catch(failure){balanceError=expenseError(failure);}
 const money=(value:number)=>formatMoney(value,house?.currency??'MYR');
 const memberName=(id:string)=>members.data?.find(m=>m.user_id===id)?.display_name??'Household member';
 if(!loaded&&!fontError)return <LoadingScreen/>;
 return <View style={s.canvas}><SafeAreaView style={s.safe}>
  <View style={s.header}>
   <Link href="/households" asChild><Pressable accessibilityRole="button" accessibilityLabel={`Switch household, ${house?.name??'no household selected'}`} style={s.houseSwitch}>
    <View style={s.houseIcon}><DashboardIcon name="building"/></View><View style={{flex:1}}><Text style={s.small}>Household</Text><Text numberOfLines={1} style={s.bold}>{house?.name??'Your shared home'}</Text></View><DashboardIcon name="chevron"/>
   </Pressable></Link>
   <Pressable accessibilityRole="button" accessibilityLabel="Notifications, coming soon" onPress={()=>notice==='notifications'?setNotice(null):openNotice('notifications')} style={s.iconButton}><DashboardIcon name="bell" color="#647084"/></Pressable>
  </View>
  <ScrollView ref={scroll} contentContainerStyle={s.content}>
   {profile.data?.display_name?<Text style={s.small}>Welcome home, {profile.data.display_name}.</Text>:null}
   {notice?<DashboardCard><Text style={s.heading}>{notice==='bills'?'Bills coming soon':notice==='settle'?'Repayments coming soon':'Notifications coming soon'}</Text><Text style={s.body}>{notice==='bills'?'Recurring bills and due-date reminders will appear here once they are available.':notice==='settle'?'Repayment recording and confirmation will be available soon. Your expense balance currently includes posted expenses only.':'Bill reminders and repayment notifications will appear here once they are available.'}</Text><Button appearance="auth" label="Got it" variant="secondary" onPress={()=>setNotice(null)}/></DashboardCard>:null}
   {intent.code?<Link href={{pathname:'/join',params:{code:intent.code}}} asChild><Button appearance="auth" label="Continue household invitation"/></Link>:null}
   {houses.isPending?<DashboardCard><Text style={s.body}>Loading your household…</Text></DashboardCard>:null}
   {houses.isError?<DashboardCard><Text accessibilityRole="alert" style={s.error}>{householdError(houses.error)}</Text><Button appearance="auth" label="Retry households" loading={houses.isFetching} onPress={()=>void houses.refetch()}/></DashboardCard>:null}
   {houses.isSuccess&&!house?<>
    <View style={s.balance}><Image source={require('../../../assets/images/dashboard/balance-background.svg')} style={StyleSheet.absoluteFill} contentFit="fill"/>
     <Text style={s.balanceLabel}>Make room for your household.</Text><Text style={[s.amount,{fontSize:28,lineHeight:34}]}>Shared living.{'\n'}Simpler money.</Text><Text style={s.balanceHint}>Create a household or join your roommates to get started.</Text>
     <View style={s.balanceActions}><Link href="/households/create" asChild><Button appearance="auth" label="Create household" style={s.primaryAction} labelStyle={s.primaryLabel}/></Link><Link href="/join" asChild><Button appearance="auth" label="Join household" variant="secondary" style={s.secondaryAction} labelStyle={s.secondaryLabel}/></Link></View>
    </View>
    <DashboardCard><Text style={s.heading}>Your home, in one place</Text><Text style={s.body}>Track shared expenses, choose how to split them, and keep a clear history with your roommates.</Text></DashboardCard>
   </>:null}
   {house?<>
    <View style={s.balance}>
     <Image source={require('../../../assets/images/dashboard/balance-background.svg')} style={StyleSheet.absoluteFill} contentFit="fill"/>
     <View style={s.balanceTop}><View style={s.balanceIcon}><DashboardIcon name={summary&&summary.net<0?'arrowDown':'arrowUp'} color="white"/></View><Text style={s.balanceLabel}>{summary?summary.net>0?'You are owed':summary.net<0?'You owe':'Expense balance':'Expense balance'}</Text><Text style={s.badge}>{house.currency}</Text></View>
     {expenses.isPending?<><Text style={[s.amount,{fontSize:25}]}>Loading…</Text><Text style={s.balanceHint}>Fetching your posted expenses</Text></>:expenses.isError||balanceError?<><Text style={[s.amount,{fontSize:25}]}>Unavailable</Text><Text accessibilityRole="alert" style={s.balanceHint}>{balanceError??expenseError(expenses.error)}</Text></>:summary?<><Text style={s.amount}>{money(Math.abs(summary.net))}</Text><Text style={s.balanceHint}>{summary.count===0?'No posted expenses yet':`From ${summary.count} posted expense${summary.count===1?'':'s'}`}</Text></>:<Text style={s.balanceHint}>Your membership is unavailable. Reopen this household to try again.</Text>}
     <View style={s.balanceActions}><Link href={{pathname:'/expenses/create',params:{household:house.id}}} asChild><Button appearance="auth" label="Add expense" leadingIcon={<DashboardIcon name="plus" color="#0b5f59"/>} style={s.primaryAction} labelStyle={s.primaryLabel}/></Link><Button appearance="auth" label="Settle up" leadingIcon={<DashboardIcon name="wallet" color="white"/>} variant="secondary" style={s.secondaryAction} labelStyle={s.secondaryLabel} onPress={()=>openNotice('settle')}/></View>
    </View>
    <View style={s.note}><DashboardIcon name="shield" color="#647084"/><Text style={[s.small,{flex:1}]}>This balance includes posted expenses. Repayments will be included when available.</Text></View>
    <View style={s.section}><Text accessibilityRole="header" style={s.heading}>Coming up</Text><Pressable accessibilityRole="button" accessibilityLabel="About upcoming bills" onPress={()=>openNotice('bills')}><Text style={s.link}>About bills</Text></Pressable></View>
    <DashboardCard><View style={{flexDirection:'row',gap:12,alignItems:'center'}}><View style={s.emptyIcon}><DashboardIcon name="calendar"/></View><View style={{flex:1}}><Text style={s.bold}>Bill reminders coming soon</Text><Text style={s.small}>Keep track of recurring household costs when this feature is available.</Text></View></View></DashboardCard>
    <View style={s.section}><Text accessibilityRole="header" style={s.heading}>Recent activity</Text><Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={()=>setExpanded(v=>!v)}><Text style={s.link}>{expanded?'Show less':'View more'}</Text></Pressable></View>
    <DashboardCard>
     {activity.isPending?<Text style={s.small}>Loading activity…</Text>:activity.isError?<><Text accessibilityRole="alert" style={s.error}>{expenseError(activity.error)}</Text><Button appearance="auth" variant="secondary" label="Retry activity" onPress={()=>void activity.refetch()}/></>:activity.data.length===0?<><Text style={s.bold}>Your shared story starts here</Text><Text style={s.small}>Posted, edited, and voided expenses will appear here.</Text></>:activity.data.map(event=><ActivityRow key={event.id} event={event} name={memberName(event.actor_id)} currency={house.currency}/>)}
     {expanded&&activity.data?.length===50?<Text style={s.small}>Showing the latest 50 changes. Open an expense for its complete revision history.</Text>:null}
    </DashboardCard>
    {members.isError?<Text style={s.small}>Member names could not be loaded. Activity still shows your saved records.</Text>:null}
   </>:null}
   {profile.isError?<DashboardCard><Text style={s.small}>Your profile could not be loaded.</Text><Button appearance="auth" label="Retry profile" variant="secondary" onPress={()=>void profile.refetch()}/></DashboardCard>:null}
  </ScrollView>
  {house?<Link href={{pathname:'/expenses/create',params:{household:house.id}}} asChild><Pressable accessibilityRole="button" accessibilityLabel="Add expense" style={s.fab}><DashboardIcon name="plus" color="white"/></Pressable></Link>:null}
  <View style={s.nav}>
   <Link href="/home" asChild><Pressable accessibilityRole="button" accessibilityState={{selected:true}} style={s.navItem}><View style={s.indicator}/><DashboardIcon name="home"/><Text style={[s.navLabel,s.activeNav]}>Home</Text></Pressable></Link>
   <Link href="/expenses" asChild><Pressable accessibilityRole="button" style={s.navItem}><DashboardIcon name="receipt" color="#8a929d"/><Text style={s.navLabel}>Expenses</Text></Pressable></Link>
   <Pressable accessibilityRole="button" accessibilityLabel="Bills, coming soon" style={s.navItem} onPress={()=>openNotice('bills')}><DashboardIcon name="calendar" color="#8a929d"/><Text style={s.navLabel}>Bills</Text></Pressable>
   <Link href="/profile" asChild><Pressable accessibilityRole="button" style={s.navItem}><DashboardIcon name="user" color="#8a929d"/><Text style={s.navLabel}>Me</Text></Pressable></Link>
  </View>
 </SafeAreaView></View>;
}
function ActivityRow({event,name,currency}:{event:ActivityEvent;name:string;currency:string}) {
 const metadata=event.metadata!==null&&typeof event.metadata==='object'&&!Array.isArray(event.metadata)?event.metadata:{};
 const title=typeof metadata.title==='string'?metadata.title:'Household expense';
 const action=event.event_type==='expense_created'?'Posted':event.event_type==='expense_edited'?'Edited':event.event_type==='expense_voided'?'Voided':'Changed';
 let amount:string|null=null;try{if(typeof metadata.amount_minor==='number'||typeof metadata.amount_minor==='string')amount=formatMoney(safeMinor(metadata.amount_minor),currency);}catch{}
 return <Link href={{pathname:'/expenses/[id]',params:{id:event.entity_id}}} asChild><Pressable accessibilityRole="button" accessibilityLabel={`${title}, ${action} by ${name}`} style={s.activityRow}>
  <View style={s.emptyIcon}><DashboardIcon name={action==='Posted'?'receipt':'history'}/></View><View style={{flex:1}}><Text style={s.bold}>{title}</Text><Text style={s.small}>{action} by {name}</Text><Text style={[s.small,{fontSize:10}]}>{new Date(event.created_at).toLocaleString()}</Text></View>{amount?<Text style={s.bold}>{amount}</Text>:null}
 </Pressable></Link>;
}
