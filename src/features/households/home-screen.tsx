import { displayExpenseTitle } from '@/features/expenses/display-title';
import { CategoryIcon } from '@/features/expenses/ui';
import { palette as appPalette } from '@/theme/palette';
import { UpcomingBills } from '@/features/bills/upcoming-card';
import { NotificationBell } from '@/features/notifications/notifications';
import { Link } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import {ScrollView,StyleSheet,Text,View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useRoomieFonts } from '@/hooks/use-roomie-fonts';
import { useProfile } from '@/features/profile/use-profile';
import { useExpenses,useExpenseMembers } from '@/features/expenses/hooks';
import { expenseError } from '@/features/expenses/validation';
import { money as formatMoney,safeMinor } from '@/features/expenses/domain';
import { useSettlements } from '@/features/settlements/hooks';
import { settlementError } from '@/features/settlements/api';
import { expenseSummary } from '@/features/dashboard/summary';
import { useActivity } from '@/features/dashboard/use-activity';
import { DashboardCard,DashboardIcon,styles as s } from '@/features/dashboard/components';
import { useHouseholds } from './use-households';
import { HouseholdEmptyState } from './household-empty-state';
import { householdError } from './validation';
import { useInviteIntent } from './invite-intent';
import { authColors as c,authFonts as f } from '@/theme/auth-tokens';
import type { ActivityEvent } from '@/types/database';

export function HomeScreen() {
 const [loaded,fontError]=useRoomieFonts();
 const profile=useProfile();const houses=useHouseholds();const intent=useInviteIntent();
 const house=houses.current;const expenses=useExpenses(house?.id??'');const members=useExpenseMembers(house?.id??'');const settlements=useSettlements(house?.id??'');
 const [expanded,setExpanded]=useState(false);const activity=useActivity(house?.id??'',expanded);
 let summary:ReturnType<typeof expenseSummary>|null=null;let balanceError:string|null=null;
 if(expenses.isSuccess&&houses.membership)try{summary=expenseSummary(expenses.data,houses.membership.id);}catch(failure){balanceError=expenseError(failure);}
 if(summary&&settlements.isSuccess){const mine=settlements.data.balances.find(b=>b.member_id===houses.membership?.id);if(mine)summary={...summary,net:mine.net};else balanceError='Your membership balance is unavailable.';}
 if(settlements.isError)balanceError=settlementError(settlements.error);
 const pending=settlements.data?.settlements.filter(r=>r.status==='pending'&&r.recipient_id===houses.membership?.id)??[];
 const money=(value:number)=>formatMoney(value,house?.currency??'MYR');
 const memberName=(id:string)=>members.data?.find(m=>m.user_id===id)?.display_name??'Household member';
 if(!loaded&&!fontError)return <LoadingScreen/>;
 return <View style={s.canvas}><SafeAreaView style={s.safe}>
  <View style={s.header}>
   <Link href="/households" asChild><Pressable accessibilityRole="button" accessibilityLabel={`Switch household, ${house?.name??'no household selected'}`} style={s.houseSwitch}>
    <View style={s.houseIcon}><DashboardIcon name="building"/></View><View style={{flex:1}}><Text style={s.small}>Household</Text><Text numberOfLines={1} style={s.bold}>{house?.name??(houses.isPending?'Loading household…':'No household yet')}</Text></View><DashboardIcon name="chevron"/>
   </Pressable></Link>
   <NotificationBell/>
  </View>
  <ScrollView contentContainerStyle={s.content}>
   {profile.data?.display_name?<Text style={s.small}>Welcome home, {profile.data.display_name}.</Text>:null}
   {intent.code?<Link href={{pathname:'/join',params:{code:intent.code}}} asChild><Button appearance="auth" label="Continue household invitation"/></Link>:null}
   {houses.isPending?<DashboardCard><Text style={s.body}>Loading your household…</Text></DashboardCard>:null}
   {houses.isError?<DashboardCard><Text accessibilityRole="alert" style={s.error}>{householdError(houses.error)}</Text><Button appearance="auth" label="Retry households" loading={houses.isFetching} onPress={()=>void houses.refetch()}/></DashboardCard>:null}
   {houses.isSuccess&&!house?<HouseholdEmptyState/>:null}
   {house?<>
    <View style={s.balance}>
     <Image source={require('../../../assets/images/dashboard/balance-background.svg')} style={StyleSheet.absoluteFill} contentFit="fill"/>
     <View style={s.balanceTop}><View style={s.balanceIcon}><DashboardIcon name="wallet" color="white"/></View><Text style={s.balanceLabel}>Your net balance</Text>{summary&&!balanceError&&!expenses.isPending&&!settlements.isPending?<Text style={s.badge}>{summary.net>0?'You’re ahead':summary.net<0?'Repayment due':'All settled up'}</Text>:null}</View>
     {expenses.isPending||settlements.isPending?<><Text style={[s.amount,{fontSize:25}]}>Loading…</Text><Text style={s.balanceHint}>Fetching your household balance</Text></>:expenses.isError||balanceError?<><Text style={[s.amount,{fontSize:25}]}>Unavailable</Text><Text accessibilityRole="alert" style={s.balanceHint}>{balanceError??expenseError(expenses.error)}</Text></>:summary?<><Text style={s.amount}>{summary.net<0?'−':''}{money(Math.abs(summary.net))}</Text><View style={s.balanceBreakdown}><View style={s.balancePart}><Text style={s.balancePartLabel}>You’re owed</Text><Text style={s.balancePartAmount}>{money(Math.max(summary.net,0))}</Text></View><View style={[s.balancePart,s.balancePartDivider]}><Text style={s.balancePartLabel}>You owe</Text><Text style={s.balancePartAmount}>{money(Math.max(-summary.net,0))}</Text></View></View></>:<Text style={s.balanceHint}>Your membership is unavailable. Reopen this household to try again.</Text>}
     <View style={s.balanceActions}><Link href={{pathname:'/expenses/create',params:{household:house.id}}} asChild><Button appearance="auth" label="Add expense" leadingIcon={<DashboardIcon name="plus" color={appPalette.primaryStrong}/>} style={s.primaryAction} labelStyle={s.primaryLabel}/></Link><Link href={{pathname:'/settlements',params:{household:house.id}}} asChild><Button appearance="auth" label="Settle up" leadingIcon={<DashboardIcon name="wallet" color="white"/>} variant="secondary" style={s.secondaryAction} labelStyle={s.secondaryLabel}/></Link></View>
    </View>
    <View style={s.note}><DashboardIcon name="shield" color={appPalette.muted}/><Text style={[s.small,{flex:1}]}>Balances include posted expenses and confirmed repayments. Pending payments have no effect.</Text></View>
    {pending.length?<Link href={{pathname:'/settlements',params:{household:house.id,view:'history',...(pending.length===1?{payment:pending[0].id}:{})}}} asChild>
     <Pressable accessibilityRole="button" accessibilityLabel={`${pending.length} payment${pending.length===1?' needs':'s need'} your review. Review incoming repayments.`} style={reminder.card}>
      <View style={reminder.icon}><Image source={require('../../../assets/images/dashboard/clock.svg')} style={reminder.clock} contentFit="contain"/></View>
      <View style={reminder.copy}><Text style={reminder.title}>{pending.length} payment{pending.length===1?' needs':'s need'} your review</Text><Text style={reminder.detail}>{pending.length===1?`${members.data?.find(m=>m.id===pending[0].sender_id)?.display_name??'A household member'} recorded ${money(pending[0].amount_minor)} sent to you`:'Incoming payments are waiting for your confirmation'}</Text></View>
      <Image source={require('../../../assets/images/dashboard/chevron.svg')} style={reminder.chevron} tintColor={c.ink} contentFit="contain"/>
     </Pressable>
    </Link>:null}
    <UpcomingBills house={house.id} currency={house.currency}/>
    <View style={s.section}><Text accessibilityRole="header" style={s.heading}>Recent activity</Text><Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={()=>setExpanded(v=>!v)}><Text style={s.link}>{expanded?'Show less':'View more'}</Text></Pressable></View>
    <DashboardCard>
     {activity.isPending?<Text style={s.small}>Loading activity…</Text>:activity.isError?<><Text accessibilityRole="alert" style={s.error}>{expenseError(activity.error)}</Text><Button appearance="auth" variant="secondary" label="Retry activity" onPress={()=>void activity.refetch()}/></>:activity.data.length===0?<><Text style={s.bold}>Your shared story starts here</Text><Text style={s.small}>Added, edited, and cancelled expenses will appear here.</Text></>:activity.data.map((event,index)=><ActivityRow key={event.id} divider={index<activity.data.length-1} event={event} name={memberName(event.actor_id)} currency={house.currency} category={expenses.data?.expenses.find(expense=>expense.id===event.entity_id)?.category}/>)}
     {expanded&&activity.data?.length===50?<Text style={s.small}>Showing the latest 50 changes. Open an expense for its complete revision history.</Text>:null}
    </DashboardCard>
    {members.isError?<Text style={s.small}>Member names could not be loaded. Activity still shows your saved records.</Text>:null}
   </>:null}
   {profile.isError?<DashboardCard><Text style={s.small}>Your profile could not be loaded.</Text><Button appearance="auth" label="Retry profile" variant="secondary" onPress={()=>void profile.refetch()}/></DashboardCard>:null}
  </ScrollView>
  {house?<Link href={{pathname:'/expenses/create',params:{household:house.id}}} asChild><Pressable accessibilityRole="button" accessibilityLabel="Add expense" style={s.fab}><DashboardIcon name="plus" color="white"/></Pressable></Link>:null}
  <View style={s.nav}>
   <Link href="/home" asChild><Pressable accessibilityRole="button" accessibilityState={{selected:true}} style={s.navItem}><View style={s.indicator}/><DashboardIcon name="home"/><Text style={[s.navLabel,s.activeNav]}>Home</Text></Pressable></Link>
   <Link href="/expenses" asChild><Pressable accessibilityRole="button" style={s.navItem}><DashboardIcon name="receipt" color={appPalette.subtleText}/><Text style={s.navLabel}>Expenses</Text></Pressable></Link>
   <Link href="/bills" asChild><Pressable accessibilityRole="button" style={s.navItem}><DashboardIcon name="calendar" color={appPalette.subtleText}/><Text style={s.navLabel}>Bills</Text></Pressable></Link>
   <Link href="/profile" asChild><Pressable accessibilityRole="button" style={s.navItem}><DashboardIcon name="user" color={appPalette.subtleText}/><Text style={s.navLabel}>Me</Text></Pressable></Link>
  </View>
 </SafeAreaView></View>;
}
function ActivityRow({event,name,currency,category,divider}:{event:ActivityEvent;name:string;currency:string;category?:string;divider:boolean}) {
 const metadata=event.metadata!==null&&typeof event.metadata==='object'&&!Array.isArray(event.metadata)?event.metadata:{};
 const title=displayExpenseTitle(typeof metadata.title==='string'?metadata.title:'Household expense');
 const iconCategory=title.trim().toLowerCase()==='transport'?'Transport':category??'';
 const action=event.event_type==='expense_created'?'Posted':event.event_type==='expense_edited'?'Edited':event.event_type==='expense_voided'?'Cancelled':'Changed';
 let amount:string|null=null;try{if(typeof metadata.amount_minor==='number'||typeof metadata.amount_minor==='string')amount=formatMoney(safeMinor(metadata.amount_minor),currency);}catch{}
 return <Link href={{pathname:'/expenses/[id]',params:{id:event.entity_id}}} asChild><Pressable accessibilityRole="button" accessibilityLabel={`${title}, ${action} by ${name}`} style={StyleSheet.flatten([s.activityRow,!divider&&{borderBottomWidth:0}])}>
  <CategoryIcon category={iconCategory} inactive={action==='Cancelled'}/><View style={{flex:1}}><Text style={s.bold}>{title}</Text><Text style={s.small}>{action} by {name}</Text><Text style={[s.small,{fontSize:10}]}>{new Date(event.created_at).toLocaleString()}</Text></View>{amount?<Text style={s.bold}>{amount}</Text>:null}
 </Pressable></Link>;
}

// Published Figma Home pending-card; parent content supplies its 14px top spacing.
const reminder=StyleSheet.create({
 card:{minHeight:74,padding:14,marginBottom:10,backgroundColor:appPalette.warningSoft,borderWidth:1,borderColor:appPalette.warningBorder,borderRadius:16,flexDirection:'row',alignItems:'center',gap:12},
 icon:{width:40,height:40,borderRadius:12,backgroundColor:appPalette.warningIcon,alignItems:'center',justifyContent:'center'},
 clock:{width:20,height:20},chevron:{width:18,height:18},
 copy:{flex:1,minWidth:0},title:{fontFamily:f.bold,fontSize:13,lineHeight:18,color:c.ink},
 detail:{fontFamily:f.regular,fontSize:12,lineHeight:18,color:c.muted,marginTop:4},
});
