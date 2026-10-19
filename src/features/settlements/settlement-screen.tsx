import { useRef,useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text,View } from 'react-native';
import { useMutation,useQueryClient } from '@tanstack/react-query';
import { HouseholdSheet } from '@/features/households/household-sheet';
import { useHouseholds } from '@/features/households/use-households';
import { useExpenseMembers } from '@/features/expenses/hooks';
import { DashboardCard,DashboardIcon,styles as s } from '@/features/dashboard/components';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Choice } from '@/features/expenses/ui';
import { money,parseMinor,decimal,localToday,validDate,MAX_MINOR } from '@/features/expenses/domain';
import { DateRangeCalendar } from '@/features/expenses/date-range-calendar';
import { BalanceLegend,ExternalPaymentNote,PaymentReview,RepaymentCard,styles } from './settlement-ui';
import { useAuth } from '@/lib/auth-context';
import { useSettlements } from './hooks';
import { decideSettlement,recordSettlement,settlementError } from './api';
import { settlementSuggestions } from './domain';
export function SettlementScreen(){
 const params=useLocalSearchParams<{household?:string}>();const houses=useHouseholds();const house=params.household?houses.houses.find(h=>h.id===params.household):houses.current;
 const {session}=useAuth();const query=useSettlements(house?.id??'');const members=useExpenseMembers(house?.id??'');const client=useQueryClient();
 const [requestSeed]=useState(()=>`${Date.now()}-${Math.random().toString(36).slice(2)}`);const [sequence,setSequence]=useState(0);
 const [form,setForm]=useState<{recipient:string;amount:string;date:string;request:string}|null>(null);const [locked,setLocked]=useState(false);const [calendar,setCalendar]=useState(false);const [error,setError]=useState<string|null>(null);const [message,setMessage]=useState('');const lock=useRef(false);
 const [decision,setDecision]=useState<{id:string;confirm:boolean}|null>(null);
 const refresh=async()=>{await Promise.all([client.invalidateQueries({queryKey:['settlements']}),client.invalidateQueries({queryKey:['activity']})]);};
 const create=useMutation({mutationFn:async()=>{if(!form||!house)throw new Error();return recordSettlement(house.id,form.recipient,parseMinor(form.amount,false,house.currency),form.date,form.request);},retry:false,onSuccess:async()=>{await refresh();setForm(null);setLocked(false);setMessage('Repayment recorded. Waiting for the recipient to confirm.');}});
 const decide=useMutation({mutationFn:({id,confirm}:{id:string;confirm:boolean})=>decideSettlement(id,confirm),retry:false,onSuccess:async()=>{await refresh();setMessage('Repayment decision saved.');}});
 const busy=create.isPending||decide.isPending;
 const mine=query.data?.balances.find(b=>b.user_id===session?.user.id);const net=mine?.net;
 const name=(id:string)=>members.data?.find(m=>m.id===id)?.display_name??'Household member';const format=(amount:number)=>money(amount,house?.currency??'MYR');
 let suggestions:ReturnType<typeof settlementSuggestions>=[];let balanceError=false;try{if(query.data)suggestions=settlementSuggestions(query.data.balances);}catch{balanceError=true;}
 function record(recipient='',amount?:number){setSequence(v=>v+1);setError(null);setMessage('');setLocked(false);setForm({recipient,amount:amount?decimal(Math.min(amount,MAX_MINOR),house?.currency??'MYR'):'',date:localToday(),request:`repay-${requestSeed}-${sequence}`});}
 async function submit(){if(lock.current||!form)return;setError(null);try{if(!validDate(form.date)||form.date>localToday())throw new Error('Choose a payment date on or before today.');if(!form.recipient)throw new Error('Choose a recipient.');parseMinor(form.amount,false,house?.currency??'MYR');}catch(e){setError(e instanceof Error?e.message:'Check repayment details.');return;}lock.current=true;setLocked(true);try{await create.mutateAsync();}catch(e){setError(settlementError(e)+' If the result is uncertain, retry these same details or check history before recording again.');}finally{lock.current=false;}}
 return <HouseholdSheet title={form?'Record repayment':decision?'Payment details':'Balances & settle up'} subtitle={house?.name??'Choose a household'} busy={busy}>
  {form?<ExternalPaymentNote/>:null}
  {message?<Text accessibilityLiveRegion="polite" style={s.body}>{message}</Text>:null}{error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
  {form?<>
   <Text style={s.heading}>Who did you pay?</Text><View style={{gap:8}}>{members.data?.filter(m=>m.status==='active'&&m.user_id!==session?.user.id).map(m=><Choice key={m.id} label={m.display_name} selected={form.recipient===m.id} disabled={locked||busy} onPress={()=>setForm({...form,recipient:m.id})}/>)}</View>
   <Input appearance="auth" label={`Amount (${house?.currency??''})`} placeholder="0" keyboardType="decimal-pad" value={form.amount} editable={!locked&&!busy} onChangeText={amount=>setForm({...form,amount})}/>
   <Button appearance="auth" variant="secondary" label={`Payment date: ${form.date}`} disabled={locked||busy} onPress={()=>setCalendar(v=>!v)}/>
   {calendar?<DateRangeCalendar single start={form.date} end={form.date} onChange={range=>{setForm({...form,date:range.start});setCalendar(false);}}/>:null}
   <Text style={s.small}>Record only a payment you have already sent. The recipient will review it. This is not a request for them to pay you.</Text>
   <Button appearance="auth" label={locked?'Retry same repayment':'Record payment sent'} loading={busy} onPress={()=>void submit()}/><Button appearance="auth" variant="secondary" label={locked?'Check repayment history':'Cancel'} disabled={busy} onPress={()=>{setForm(null);setLocked(false);setError(null);void query.refetch();}}/>
  </>:decision?(()=>{const row=query.data?.settlements.find(r=>r.id===decision.id);return row?<PaymentReview row={row} sender={name(row.sender_id)} recipient={name(row.recipient_id)} format={format} balances={query.data?.balances??[]} canDecide={row.recipient_id===mine?.member_id} busy={busy} onDecide={confirm=>{setError(null);decide.mutate({id:row.id,confirm},{onError:e=>setError(settlementError(e))});}} onBack={()=>{setDecision(null);setError(null);setMessage('');}}/>:<Button appearance="auth" label="Back to history" onPress={()=>setDecision(null)}/>;})():<>
   {houses.isPending||query.isPending&&!!house?<Text style={s.body}>Loading balances…</Text>:null}
   {houses.isError?<><Text style={s.error}>Households could not be loaded.</Text><Button appearance="auth" label="Retry households" onPress={()=>void houses.refetch()}/></>:!house?<Text style={s.body}>Create or join a household first.</Text>:null}
   {query.isError?<><Text accessibilityRole="alert" style={s.error}>{settlementError(query.error)}</Text><Button appearance="auth" label="Retry balances" onPress={()=>void query.refetch()}/></>:null}
   {query.isSuccess&&house?<>
    <View style={styles.summary}><View style={styles.summaryIcon}><DashboardIcon name={net!==undefined&&net<0?'arrowDown':'arrowUp'} color="white"/></View><View style={{flex:1}}><Text style={styles.summaryLabel}>{net===undefined?'Balance unavailable':net>0?'You are owed':net<0?'You owe':'All settled up'}</Text><Text style={styles.summaryAmount}>{net===undefined?'—':format(Math.abs(net))}</Text><Text style={styles.summaryHint}>Posted expenses and confirmed repayments</Text></View></View>
    {balanceError?<Text style={s.error}>Balances could not be verified. Refresh before recording a payment.</Text>:<><Text style={s.heading}>Suggested repayments</Text>{suggestions.length===0?<DashboardCard><Text style={s.body}>No repayment needed. All household balances are zero.</Text></DashboardCard>:suggestions.map((route,index)=>{const pending=query.data.settlements.find(row=>row.sender_id===route.sender&&row.recipient_id===route.recipient&&row.status==='pending');const canRecord=route.sender===mine?.member_id&&members.data?.some(m=>m.id===route.recipient&&m.status==='active');return <RepaymentCard key={`${route.sender}-${route.recipient}`} index={index} name={name(route.sender)} title={route.sender===mine?.member_id?`You pay ${name(route.recipient)}`:route.recipient===mine?.member_id?`${name(route.sender)} pays you`:`${name(route.sender)} pays ${name(route.recipient)}`} detail={pending?`Suggested route · ${format(pending.amount_minor)} pending`:'Suggested route · Unrecorded'} amount={format(route.amount)} status={pending?'pending':undefined} action={pending?'View payment':canRecord?'Record':undefined} onPress={pending?()=>setDecision({id:pending.id,confirm:true}):canRecord?()=>record(route.recipient,route.amount):undefined}/>;})}</>}
    {members.isError?<><Text style={s.error}>Member names could not be loaded.</Text><Button appearance="auth" label="Retry members" onPress={()=>void members.refetch()}/></>:null}
    <Button appearance="auth" label="Record another repayment" disabled={!members.isSuccess||balanceError||!members.data.some(m=>m.status==='active'&&m.user_id!==session?.user.id)} onPress={()=>record()}/>
    <ExternalPaymentNote/>
    <Text style={s.heading}>How balances work</Text><BalanceLegend/>
    <Text style={s.heading}>Repayment history</Text><Text style={s.small}>All pending records and the latest 100 decided repayments. Pending and rejected records have no balance effect.</Text>
    {query.data.settlements.length===0?<Text style={s.body}>No repayments recorded yet.</Text>:query.data.settlements.map((row,index)=><RepaymentCard key={row.id} index={index} name={name(row.sender_id)} title={`${name(row.sender_id)} → ${name(row.recipient_id)}`} detail={`Paid ${row.payment_date}`} amount={format(row.amount_minor)} status={row.status} action={row.status==='pending'&&row.recipient_id===mine?.member_id?'Review payment':'View details'} onPress={()=>{setError(null);setMessage('');setDecision({id:row.id,confirm:true});}}/>)}
   </>:null}
  </>}
 </HouseholdSheet>;
}
