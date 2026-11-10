import { palette as appPalette } from '@/theme/palette';
import { useState } from 'react';
import { Link,useLocalSearchParams } from 'expo-router';
import {ScrollView,Text,View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Button } from '@/components/ui/button';
import { useRoomieFonts } from '@/hooks/use-roomie-fonts';
import { useHouseholds } from '@/features/households/use-households';
import { HouseholdEmptyState } from '@/features/households/household-empty-state';
import { householdError } from '@/features/households/validation';
import { useExpenseMembers } from '@/features/expenses/hooks';
import { splitExpense, localToday,money } from '@/features/expenses/domain';
import { CategoryIcon } from '@/features/expenses/ui';
import { NotificationBell } from '@/features/notifications/notifications';
import { DashboardIcon,styles as d } from '@/features/dashboard/components';
import { BillSheet } from './bill-sheet';
import { useBills,type Bill,billError,dueLabel } from './api';
import { styles as s } from './styles';

export function BillsDashboard(){
 const params=useLocalSearchParams<{household?:string;bill?:string}>();
 const [loaded,fontError]=useRoomieFonts();const houses=useHouseholds();const house=params.household?houses.houses.find(h=>h.id===params.household):houses.current;
 const bills=useBills(house?.id??'');const members=useExpenseMembers(house?.id??'');const owner=houses.data?.memberships.find(m=>m.household_id===house?.id)?.role==='owner';
 const [sheet,setSheet]=useState<{house:string;bill:Bill|null}|null>(null);
 const [dismissed,setDismissed]=useState<string|null>(null);
 const linkedBill=bills.data?.find(b=>b.id===params.bill);
 const visibleSheet=sheet??(house&&linkedBill&&dismissed!==params.bill?{house:house.id,bill:linkedBill}:null);
 const today=localToday();
 const groups=[{title:'Needs attention',rows:bills.data?.filter(b=>b.active&&b.next_due_date<=today)??[],empty:'No bills need attention right now.'},{title:'Upcoming',rows:bills.data?.filter(b=>b.active&&b.next_due_date>today)??[],empty:'No upcoming bills yet.'},{title:'Paused',rows:bills.data?.filter(b=>!b.active)??[],empty:''}];
 if(!loaded&&!fontError)return <LoadingScreen/>;
 return <View style={d.canvas}><SafeAreaView style={d.safe}>
  <View style={d.header}><Link href="/households" asChild><Pressable accessibilityRole="button" accessibilityLabel="Switch household" style={d.houseSwitch}><View style={d.houseIcon}><DashboardIcon name="building"/></View><View style={{flex:1}}><Text style={d.small}>Household</Text><Text numberOfLines={1} style={d.bold}>{house?.name??(houses.isPending?'Loading household…':'No household yet')}</Text></View><DashboardIcon name="chevron"/></Pressable></Link><NotificationBell/></View>
  <ScrollView contentContainerStyle={s.content}>
   <View style={s.heading}><View><Text style={s.eyebrow}>Recurring bills</Text><Text accessibilityRole="header" style={s.title}>Stay ahead</Text></View>{house&&owner?<Button appearance="auth" label="Add bill" style={s.add} leadingIcon={<DashboardIcon name="plus" color="white"/>} disabled={!members.isSuccess||!bills.isSuccess} onPress={()=>setSheet({house:house.id,bill:null})}/>:null}</View>
   <View style={s.info}><DashboardIcon name="bell" color={appPalette.info}/><Text style={s.infoText}>Reminders have no balance effect until you review and post them.</Text></View>
   {houses.isPending?<Text style={s.small}>Loading your household…</Text>:houses.isError?<><Text style={s.error}>{householdError(houses.error)}</Text><Button appearance="auth" label="Retry households" onPress={()=>void houses.refetch()}/></>:!house?<HouseholdEmptyState/>:null}
   {house?<>
    {bills.isPending?<Text style={[s.small,{marginTop:24}]}>Loading recurring bills…</Text>:null}
    {bills.isError?<><Text accessibilityRole="alert" style={s.error}>{billError(bills.error)}</Text><Button appearance="auth" variant="secondary" style={s.secondary} labelStyle={s.secondaryText} label="Retry bills" loading={bills.isFetching} onPress={()=>void bills.refetch()}/></>:null}
    {members.isError?<><Text style={s.error}>Member details could not be loaded.</Text><Button appearance="auth" label="Retry members" onPress={()=>void members.refetch()}/></>:null}
    {bills.isSuccess?groups.filter(group=>group.title!=='Paused'||group.rows.length).map(group=><View key={group.title}><Text accessibilityRole="header" style={s.section}>{group.title}</Text>{group.rows.length?group.rows.map(bill=><BillCard key={bill.id} bill={bill} today={today} currency={house.currency} payer={members.data?.find(m=>m.id===bill.payer_id)?.display_name??'Household member'} ownMember={houses.data?.memberships.find(m=>m.household_id===house.id)?.id} disabled={!members.isSuccess} onPress={()=>setSheet({house:house.id,bill})}/>):<Text style={s.empty}>{group.empty}{!bills.data.length?' The household owner can add a recurring bill to get started.':''}</Text>}</View>):null}
    {!owner?<Text style={[s.note,{marginTop:18}]}>The household owner manages recurring bills. Any active member can review and post a paid occurrence.</Text>:null}
   </>:null}
  </ScrollView>
  <View style={d.nav}>{([{label:'Home',href:'/home',icon:'home'},{label:'Expenses',href:'/expenses',icon:'receipt'},{label:'Bills',href:'/bills',icon:'calendar'},{label:'Me',href:'/profile',icon:'user'}] as const).map(item=><Link key={item.label} href={item.href} asChild><Pressable accessibilityRole="button" accessibilityState={{selected:item.label==='Bills'}} style={d.navItem}>{item.label==='Bills'?<View style={d.indicator}/>:null}<DashboardIcon name={item.icon} color={item.label==='Bills'?appPalette.primary:appPalette.subtleText}/><Text style={[d.navLabel,item.label==='Bills'&&d.activeNav]}>{item.label}</Text></Pressable></Link>)}</View>
  {visibleSheet&&house&&visibleSheet.house===house.id&&members.data?<BillSheet key={visibleSheet.bill?.id??'new'} house={house} members={members.data} owner={owner} bill={visibleSheet.bill} onClose={()=>{setSheet(null);setDismissed(params.bill??null);}}/>:null}
 </SafeAreaView></View>;
}
function BillCard({bill,today,currency,payer,ownMember,disabled,onPress}:{bill:Bill;today:string;currency:string;payer:string;ownMember?:string;disabled:boolean;onPress:()=>void}){
 const attention=bill.active&&bill.next_due_date<=today;const overdue=bill.active&&bill.next_due_date<today;const variable=bill.amount_minor===null;
 const allocation=bill.allocations.map(a=>({member_id:a.member_id,value:a.value}));
 let share:number|null=null;
 if(bill.amount_minor!==null){try{share=splitExpense(bill.amount_minor,bill.split_method==='single'?'equal':bill.split_method,bill.split_method==='equal'||bill.split_method==='single'?bill.participants.map(member_id=>({member_id})):allocation).find(a=>a.member_id===ownMember)?.owed_minor??0;}catch{share=null;}}
 return <Pressable accessibilityRole="button" accessibilityLabel={`${bill.title}, ${bill.active?dueLabel(bill.next_due_date,today):'paused'}. Open bill details.`} disabled={disabled} onPress={onPress} style={({pressed})=>[s.card,overdue&&s.overdue,!bill.active&&s.paused,pressed&&{opacity:0.8}]}>
  <View style={s.head}><CategoryIcon category={bill.category} inactive={!bill.active}/><Text style={[s.badge,overdue&&s.errorBadge,!bill.active&&s.neutralBadge]}>{bill.active?dueLabel(bill.next_due_date,today):'Paused'}</Text></View>
  <Text style={s.name}>{bill.title}</Text><Text style={s.detail}>{!bill.active?'No future reminders':variable?`Variable amount · ${bill.frequency==='monthly'?'Monthly':'Weekly'}`:`Fixed · Paid by ${payer} · ${bill.participants.length} people`}</Text>
  {bill.active?<><Text style={s.amount}>{variable?'Amount to be entered':money(bill.amount_minor!,currency)}</Text>{attention?<View style={s.secondary}><Text style={s.secondaryText}>Review & post expense</Text></View>:share!==null?<View style={s.split}><Text style={s.small}>Your share</Text><Text style={s.bold}>{money(share,currency)}</Text></View>:null}</>:null}
 </Pressable>;
}
