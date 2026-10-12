import { Link } from 'expo-router';
import { useState } from 'react';
import { Text,View,Pressable,StyleSheet } from 'react-native';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useHouseholds } from '@/features/households/use-households';
import { useAuth } from '@/lib/auth-context';
import { categories,money,localToday,validDate } from './domain';
import { useExpenses,useExpenseMembers } from './hooks';
import { expenseError } from './validation';
import { ExpenseScreen,ExpenseCard,Choice,Status,Icon,s } from './ui';
export function ExpenseListScreen() {
 const house=useHouseholds();const {session}=useAuth();const query=useExpenses(house.current?.id??'');const members=useExpenseMembers(house.current?.id??'');
 const [category,setCategory]=useState('All');const [period,setPeriod]=useState('This month');const [status,setStatus]=useState('All');const [filters,setFilters]=useState(false);
 const [start,setStart]=useState('');const [end,setEnd]=useState('');
 const today=localToday();const month=today.slice(0,7);const last=new Date(`${month}-01T12:00:00`);last.setMonth(last.getMonth()-1);const lastMonth=`${last.getFullYear()}-${String(last.getMonth()+1).padStart(2,'0')}`;
 const validRange=period!=='Custom dates'||(validDate(start)&&validDate(end)&&start<=end);
 const rows=(query.data?.expenses??[]).filter(e=>(category==='All'||e.category===category)&&(status==='All'||e.status===status.toLowerCase())&&(period==='All time'||(period==='This month'&&e.expense_date.startsWith(month))||(period==='Last month'&&e.expense_date.startsWith(lastMonth))||(period==='Custom dates'&&validRange&&e.expense_date>=start&&e.expense_date<=end))).sort((a,b)=>b.expense_date.localeCompare(a.expense_date)||a.id.localeCompare(b.id));
 const total=rows.filter(e=>e.status==='posted').reduce((sum,e)=>sum+e.amount_minor,0);
 const myMember=members.data?.find(m=>m.user_id===session?.user.id);
 const name=(id:string)=>members.data?.find(m=>m.id===id)?.display_name??'Household member';
 return <ExpenseScreen title="Expenses" subtitle={house.current?.name??'Choose your household'}>
  <Link href="/households" style={s.small}>Switch household</Link>
  {house.isPending?<Text style={s.small}>Loading households…</Text>:house.isError?<Text accessibilityRole="alert" style={s.error}>{expenseError(house.error)}</Text>:!house.current?<><Text style={s.body}>Create or join a household to track shared expenses.</Text><Link href="/households/create" asChild><Button label="Create household" appearance="auth"/></Link></>:null}
  {house.current?<>
   {members.isError?<Text accessibilityRole="alert" style={s.error}>Member names and personal shares could not be loaded. Refresh or retry.</Text>:null}
   {query.isPending?<Text style={s.small}>Loading expenses…</Text>:query.isError?<><Text accessibilityRole="alert" style={s.error}>{expenseError(query.error)}</Text><Button label="Retry" onPress={()=>void query.refetch()}/></>:<>
    <View style={s.dual}><View style={{flex:1}}><Text style={s.small}>Posted spending · {category}</Text><Text style={s.title}>{Number.isSafeInteger(total)?money(total):'Total exceeds supported display range'}</Text></View><Choice label={period} selected={filters} onPress={()=>setFilters(v=>!v)}/></View>
    {filters?<ExpenseCard><Text style={s.bold}>Period</Text><View style={s.wrap}>{['This month','Last month','All time','Custom dates'].map(p=><Choice key={p} label={p} selected={period===p} onPress={()=>setPeriod(p)}/>)}</View>
     {period==='Custom dates'?<><Input appearance="auth" label="From (YYYY-MM-DD)" value={start} onChangeText={setStart}/><Input appearance="auth" label="To (YYYY-MM-DD)" value={end} onChangeText={setEnd}/>{!validRange?<Text style={s.error}>Enter a valid date range.</Text>:null}</>:null}
     <Text style={s.bold}>Status</Text><View style={s.wrap}>{['All','Posted','Void'].map(p=><Choice key={p} label={p} selected={status===p} onPress={()=>setStatus(p)}/>)}</View>
    </ExpenseCard>:null}
    <View style={s.wrap}>{['All',...categories].map(c=><Choice key={c} label={c} selected={category===c} onPress={()=>setCategory(c)}/>)}</View>
    {rows.length===0?<ExpenseCard><Text style={s.body}>No expenses in this selection.</Text><Text style={s.small}>Add an expense or change your filters.</Text></ExpenseCard>:null}
    {rows.map((e,i)=><View key={e.id}>{i===0||rows[i-1].expense_date!==e.expense_date?<Text style={[s.bold,{marginBottom:10}]}>{e.expense_date}</Text>:null}
     <Link href={{pathname:'/expenses/[id]',params:{id:e.id}}} asChild><Pressable accessibilityRole="button" accessibilityLabel={`${e.title}, ${money(e.amount_minor)}, ${e.status}`} style={StyleSheet.flatten([s.card,{backgroundColor:'white',borderWidth:1,flexDirection:'row',alignItems:'center',gap:10,opacity:e.status==='void'?0.72:1}])}>
      <View style={[s.avatar,{borderRadius:13,width:42,height:42}]}><Icon name={e.status==='void'?'close':e.category==='Groceries'?'groceries':e.category==='Utilities'?'bolt':e.category==='Rent'?'building':'receipt'}/></View>
      <View style={{flex:1}}><Text style={s.bold}>{e.title}</Text><Text style={s.small}>Paid by {(query.data?.payers.filter(p=>p.expense_id===e.id).map(p=>name(p.member_id))??[]).join(', ')||'Loading…'}</Text><Text style={s.small}>{members.isSuccess?`Your share ${money(query.data?.splits.find(p=>p.expense_id===e.id&&p.member_id===myMember?.id)?.owed_minor??0)}`:'Your share is loading or unavailable'}</Text></View>
      <View><Text style={[s.bold,e.status==='void'&&{textDecorationLine:'line-through'}]}>{money(e.amount_minor)}</Text><Status status={e.status==='posted'&&e.version>1?'Revised':e.status}/></View><Icon name="chevron"/>
     </Pressable></Link></View>)}
    <Button label="Refresh expenses" appearance="auth" variant="secondary" loading={query.isFetching} onPress={()=>void query.refetch()}/>
   </>}
   <Link href={{pathname:'/expenses/create',params:{household:house.current.id}}} asChild><Button appearance="auth" label="+ Add expense"/></Link>
  </>:null}
 </ExpenseScreen>;
}
