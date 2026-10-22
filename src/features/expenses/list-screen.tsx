import { NotificationBell } from '@/features/notifications/notifications';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Modal,ScrollView,Text,View,Pressable,StyleSheet } from 'react-native';
import { Button } from '@/components/ui/button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useRoomieFonts } from '@/hooks/use-roomie-fonts';
import { HouseholdSheet } from '@/features/households/household-sheet';
import { DashboardIcon,styles as d } from '@/features/dashboard/components';
import { ExpenseFilterSheet,ExpenseNavigation,x } from './dashboard-ui';
import { HouseholdEmptyState } from '@/features/households/household-empty-state';
import { householdError } from '@/features/households/validation';
import { useHouseholds } from '@/features/households/use-households';
import { useAuth } from '@/lib/auth-context';
import { categories,money as formatMoney,localToday,validDate } from './domain';
import { useExpenses,useExpenseMembers } from './hooks';
import { expenseError } from './validation';
import { ExpenseCard,Choice,Status,Icon,s } from './ui';
export function ExpenseListScreen() {
 const [loaded,fontError]=useRoomieFonts();const [notice,setNotice]=useState<'bills'|'notifications'|null>(null);
 const house=useHouseholds();const {session}=useAuth();const query=useExpenses(house.current?.id??'');const members=useExpenseMembers(house.current?.id??'');
 const [category,setCategory]=useState('All');const [period,setPeriod]=useState('This month');const [status,setStatus]=useState('All');const [filters,setFilters]=useState(false);
 const [start,setStart]=useState('');const [end,setEnd]=useState('');
 const money=(value:number)=>formatMoney(value,house.current?.currency??'MYR');
 const today=localToday();const month=today.slice(0,7);const last=new Date(`${month}-01T12:00:00`);last.setMonth(last.getMonth()-1);const lastMonth=`${last.getFullYear()}-${String(last.getMonth()+1).padStart(2,'0')}`;
 const three=new Date(`${month}-01T12:00:00`);three.setMonth(three.getMonth()-2);const threeStart=`${three.getFullYear()}-${String(three.getMonth()+1).padStart(2,'0')}-01`;
 const validRange=period!=='Custom dates'||(validDate(start)&&validDate(end)&&start<=end);
 const rows=(query.data?.expenses??[]).filter(e=>(category==='All'||e.category===category)&&(status==='All'||e.status===status.toLowerCase())&&(period==='All time'||(period==='Last 3 months'&&e.expense_date>=threeStart&&e.expense_date<=today)||(period==='This month'&&e.expense_date.startsWith(month))||(period==='Last month'&&e.expense_date.startsWith(lastMonth))||(period==='Custom dates'&&validRange&&e.expense_date>=start&&e.expense_date<=end))).sort((a,b)=>b.expense_date.localeCompare(a.expense_date)||a.id.localeCompare(b.id));
 const spendingPeriod=period==='Custom dates'&&validRange?`${new Date(`${start}T12:00:00`).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})} – ${new Date(`${end}T12:00:00`).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}`:period;
 const total=rows.filter(e=>e.status==='posted').reduce((sum,e)=>sum+e.amount_minor,0);
 const myMember=members.data?.find(m=>m.user_id===session?.user.id);
 const name=(id:string)=>members.data?.find(m=>m.id===id)?.display_name??'Household member';
 const grouped=new Map<string,typeof rows>();
 for(const expense of rows){const group=grouped.get(expense.expense_date);if(group)group.push(expense);else grouped.set(expense.expense_date,[expense]);}
 const groups=Array.from(grouped,([date,expenses])=>({date,expenses}));
 if(!loaded&&!fontError)return <LoadingScreen/>;
 return <View style={d.canvas}><SafeAreaView style={d.safe}>
  <View style={d.header}><Link href="/households" asChild><Pressable accessibilityRole="button" accessibilityLabel="Switch household" style={d.houseSwitch}><View style={d.houseIcon}><DashboardIcon name="building"/></View><View style={{flex:1}}><Text style={d.small}>Household</Text><Text numberOfLines={1} style={d.bold}>{house.current?.name??(house.isPending?'Loading household…':'No household yet')}</Text></View><DashboardIcon name="chevron"/></Pressable></Link><NotificationBell/></View>
  <ScrollView contentContainerStyle={x.content}>
  {house.isPending?<ExpenseCard><Text style={s.body}>Loading your household…</Text></ExpenseCard>:house.isError?<ExpenseCard><Text accessibilityRole="alert" style={s.error}>{householdError(house.error)}</Text><Button appearance="auth" label="Retry households" loading={house.isFetching} onPress={()=>void house.refetch()}/></ExpenseCard>:house.isSuccess&&!house.current?<HouseholdEmptyState expenses/>:null}
  {house.current?<>
   {members.isError?<Text accessibilityRole="alert" style={s.error}>Member names and personal shares could not be loaded.</Text>:null}
   {members.isError?<Button appearance="auth" label="Retry members" variant="secondary" onPress={()=>void members.refetch()}/>:null}
   {query.isPending?<Text style={s.small}>Loading expenses…</Text>:query.isError?<><Text accessibilityRole="alert" style={s.error}>{expenseError(query.error)}</Text><Button label="Retry" onPress={()=>void query.refetch()}/></>:<>
    <View style={x.summary}><View style={{flexShrink:1}}><Text style={s.small}>{period==='This month'?new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined,{month:'long'}):spendingPeriod} spending</Text><Text style={x.amount}>{Number.isSafeInteger(total)?money(total):'Total unavailable'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Filter expenses" style={x.filter} onPress={()=>setFilters(true)}><Text style={x.filterText}>{period}{status!=='All'?` · ${status}`:''}</Text><View style={{transform:[{rotate:'90deg'}]}}><Icon name="chevron"/></View></Pressable></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginHorizontal:-20}} contentContainerStyle={x.chips}>{['All',...categories].map(c=><Choice key={c} label={c} selected={category===c} onPress={()=>setCategory(c)}/>)}</ScrollView>
    {rows.length===0?<ExpenseCard><View style={{gap:10,alignItems:'center',paddingVertical:14}}><DashboardIcon name="receipt"/><Text style={s.bold}>{query.data?.expenses.length?'No expenses in this selection':'No shared expenses yet'}</Text><Text style={[s.small,{textAlign:'center'}]}>{query.data?.expenses.length?'Try another category or date range.':'Your household is ready. Add your first expense from Home and it will appear here.'}</Text>{!query.data?.expenses.length?<Link href="/home" asChild><Button appearance="auth" variant="secondary" label="Go to Home"/></Link>:null}</View></ExpenseCard>:null}
    {groups.map(group=><View key={group.date} style={{gap:12}}><Text accessibilityRole="header" style={x.date}>{new Date(`${group.date}T12:00:00`).toLocaleDateString(undefined,{day:'numeric',month:'long',...(group.date.slice(0,4)!==today.slice(0,4)?{year:'numeric'}:{})})}</Text><View style={x.group}>{group.expenses.map((e,index)=>{
     const splits=query.data?.splits.filter(p=>p.expense_id===e.id)??[];
     const payerNames=members.isSuccess?(query.data?.payers.filter(p=>p.expense_id===e.id).map(p=>name(p.member_id))??[]).join(', '):'Loading…';
     const bg=e.status==='void'?'#eef0f2':e.category==='Utilities'?'#fff1d5':e.category==='Transport'?'#e9f2fe':'#e7f5f2';
     return <Link key={e.id} href={{pathname:'/expenses/[id]',params:{id:e.id}}} asChild><Pressable accessibilityRole="button" accessibilityLabel={`${e.title}, ${money(e.amount_minor)}, ${e.status}`} style={StyleSheet.flatten([x.row,index>0&&x.divider,e.status==='void'&&{opacity:0.72}])}>
      <View style={[x.icon,{backgroundColor:bg}]}><Icon color={e.status==='void'?'#6d7581':e.category==='Utilities'?'#a76513':e.category==='Transport'?'#3568a8':'#0f766e'} name={e.status==='void'?'close':e.category==='Groceries'?'groceries':e.category==='Utilities'?'bolt':e.category==='Rent'?'building':'receipt'}/></View>
      <View style={{flex:1}}><Text style={x.title}>{e.title}</Text><Text numberOfLines={1} style={x.meta}>{e.status==='void'?`Voided by ${members.data?.find(m=>m.user_id===e.voided_by)?.display_name??'Household member'}`:`Paid by ${payerNames||'Household member'} · ${splits.length} people`}</Text><Text style={x.share}>{e.status==='void'?'Balance effect removed':members.isSuccess?`Your share ${money(splits.find(p=>p.member_id===myMember?.id)?.owed_minor??0)}`:'Your share unavailable'}</Text></View>
      <View style={{alignItems:'flex-end',gap:8,flexShrink:1}}><Text style={[x.value,e.status==='void'&&{textDecorationLine:'line-through'}]}>{money(e.amount_minor)}</Text><Status status={e.status==='posted'&&e.version>1?'Revised':e.status==='posted'?'Posted':'Void'}/></View><Icon name="chevron" color="#a1a8b1"/>
     </Pressable></Link>;
    })}</View></View>)}
   </>}

  </>:null}
  </ScrollView>
  <ExpenseNavigation onBills={()=>setNotice('bills')}/>
 </SafeAreaView>
 {filters?<ExpenseFilterSheet value={{period,status,start,end}} onClose={()=>setFilters(false)} onApply={value=>{setPeriod(value.period);setStatus(value.status);setStart(value.start);setEnd(value.end);setFilters(false);}}/>:null}
 {notice?<Modal transparent animationType="fade" onRequestClose={()=>setNotice(null)}><HouseholdSheet title={notice==='bills'?'Bills':'Notifications'} subtitle="Coming soon" onClose={()=>setNotice(null)}><Text style={s.body}>{notice==='bills'?'Recurring bills and due-date reminders will be available in a future milestone.':'Bill reminders and payment request notifications will appear here when available.'}</Text><Button appearance="auth" label="Got it" onPress={()=>setNotice(null)}/></HouseholdSheet></Modal>:null}
 </View>;
}
