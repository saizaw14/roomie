import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {Text,View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { useMutation,useQueryClient } from '@tanstack/react-query';
import { HouseholdSheet } from '@/features/households/household-sheet';
import { useHouseholds } from '@/features/households/use-households';
import { useExpenseMembers } from '@/features/expenses/hooks';
import { DashboardIcon,styles as s } from '@/features/dashboard/components';
import { Button } from '@/components/ui/button';
import { money,MAX_MINOR } from '@/features/expenses/domain';
import { BalanceLegend,ExternalPaymentNote,PaymentReview,RepaymentCard,styles } from './settlement-ui';
import { useAuth } from '@/lib/auth-context';
import { useSettlements } from './hooks';
import { decideSettlement,settlementError } from './api';
import { QrPaymentScreen } from './qr-payment-screen';
import { settlementSuggestions } from './domain';
export function SettlementScreen(){
 const params=useLocalSearchParams<{household?:string;view?:string;payment?:string}>();const houses=useHouseholds();const house=params.household?houses.houses.find(h=>h.id===params.household):houses.current;
 const {session}=useAuth();const query=useSettlements(house?.id??'');const members=useExpenseMembers(house?.id??'');const client=useQueryClient();
 const [error,setError]=useState<string|null>(null);const [message,setMessage]=useState('');
 const [history,setHistory]=useState(true);
 const [pay,setPay]=useState<{recipient:string;amount:number}|null>(null);
 const [decision,setDecision]=useState<{id:string;confirm:boolean}|null>(()=>params.payment?{id:params.payment,confirm:true}:null);
 const refresh=async()=>{await Promise.all([client.invalidateQueries({queryKey:['settlements']}),client.invalidateQueries({queryKey:['activity']})]);};
 const decide=useMutation({mutationFn:({id,confirm}:{id:string;confirm:boolean})=>decideSettlement(id,confirm),retry:false,onSuccess:async()=>{await refresh();setMessage('Repayment decision saved.');}});
 const busy=decide.isPending;
 const mine=query.data?.balances.find(b=>b.user_id===session?.user.id);const net=mine?.net;
 const name=(id:string)=>members.data?.find(m=>m.id===id)?.display_name??'Household member';const format=(amount:number)=>money(amount,house?.currency??'MYR');
 let suggestions:ReturnType<typeof settlementSuggestions>=[];let balanceError=false;try{if(query.data)suggestions=settlementSuggestions(query.data.balances);}catch{balanceError=true;}
 const payee=members.data?.find(m=>m.id===pay?.recipient);
 if(pay&&payee&&house)return <QrPaymentScreen key={`${house.id}-${payee.id}`} house={house.id} recipient={payee} amount={Math.min(pay.amount,MAX_MINOR)} currency={house.currency} onBack={()=>setPay(null)} onRecorded={refresh}/>;
 return <HouseholdSheet title={decision?'Payment details':'Balances & settle up'} subtitle={house?.name??'Choose a household'} busy={busy}>
  {message?<Text accessibilityLiveRegion="polite" style={s.body}>{message}</Text>:null}{error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
  {decision?(()=>{const row=query.data?.settlements.find(r=>r.id===decision.id);return query.isPending?<Text style={s.body}>Loading payment…</Text>:row?<PaymentReview row={row} sender={name(row.sender_id)} recipient={name(row.recipient_id)} format={format} balances={query.data?.balances??[]} canDecide={row.recipient_id===mine?.member_id} busy={busy} onDecide={confirm=>{setError(null);decide.mutate({id:row.id,confirm},{onError:e=>setError(settlementError(e))});}} onBack={()=>{setDecision(null);setError(null);setMessage('');}}/>:<Button appearance="auth" label="Back to history" onPress={()=>setDecision(null)}/>;})():<>
   {houses.isPending||query.isPending&&!!house?<Text style={s.body}>Loading balances…</Text>:null}
   {houses.isError?<><Text style={s.error}>Households could not be loaded.</Text><Button appearance="auth" label="Retry households" onPress={()=>void houses.refetch()}/></>:!house?<Text style={s.body}>Create or join a household first.</Text>:null}
   {query.isError?<><Text accessibilityRole="alert" style={s.error}>{settlementError(query.error)}</Text><Button appearance="auth" label="Retry balances" onPress={()=>void query.refetch()}/></>:null}
   {query.isSuccess&&house?<>
    <View style={styles.summary}><View style={styles.summaryIcon}><DashboardIcon name="wallet" color="white"/></View><View style={{flex:1}}><Text style={styles.summaryLabel}>Your net balance</Text><Text style={styles.summaryAmount}>{net===undefined?'—':`${net>0?'+':net<0?'−':''}${format(Math.abs(net))}`}</Text><Text style={styles.summaryHint}>Owed {format(Math.max(net??0,0))} · Owe {format(Math.max(-(net??0),0))}</Text></View></View>
    {balanceError?<Text style={s.error}>Balances could not be verified. Refresh before recording a payment.</Text>:<>{(['owe','owed'] as const).map(section=>{const routes=suggestions.filter(route=>section==='owe'?route.sender===mine?.member_id:route.recipient===mine?.member_id);return <View key={section} style={{gap:10}}><Text style={[s.heading,{marginTop:5,minHeight:32}]}>{section==='owe'?'You owe':'You’re owed'}</Text>{routes.length===0?<Text style={s.small}>{section==='owe'?'No repayment needed from you.':'No repayments are currently owed to you.'}</Text>:routes.map((route,index)=>{const pending=query.data.settlements.find(row=>row.sender_id===route.sender&&row.recipient_id===route.recipient&&row.status==='pending');const canRecord=section==='owe'&&members.data?.some(m=>m.id===route.recipient&&m.status==='active');return <RepaymentCard key={`${route.sender}-${route.recipient}`} index={section==='owe'?3:index+1} name={name(section==='owe'?route.recipient:route.sender)} title={section==='owe'?`You pay ${name(route.recipient)}`:`${name(route.sender)} pays you`} detail={pending?'Payment pending':'Suggested repayment'} amount={format(route.amount)} status={pending?'pending':undefined} action={pending?'View payment':canRecord?'Pay online':undefined} onPress={pending?()=>setDecision({id:pending.id,confirm:true}):canRecord?()=>setPay({recipient:route.recipient,amount:route.amount}):undefined}/>;})}</View>;})}</>}
    {members.isError?<><Text style={s.error}>Member names could not be loaded.</Text><Button appearance="auth" label="Retry members" onPress={()=>void members.refetch()}/></>:null}
    <ExternalPaymentNote/>
    <Text style={s.heading}>How balances work</Text><BalanceLegend/>
    <View style={{flexDirection:'row',justifyContent:'space-between',flexWrap:'wrap'}}><Pressable accessibilityRole="button" accessibilityState={{expanded:history}} onPress={()=>setHistory(v=>!v)} style={styles.link}><Text style={styles.linkText}>{history?'Hide repayment history':'View repayment history'}</Text></Pressable></View>
    {history?<><Text style={s.heading}>Repayment history</Text><Text style={s.small}>All pending records and the latest 100 decided repayments.</Text>
    {query.data.settlements.length===0?<Text style={s.body}>No repayments recorded yet.</Text>:query.data.settlements.map((row,index)=><RepaymentCard key={row.id} index={index} name={name(row.sender_id)} title={`${name(row.sender_id)} → ${name(row.recipient_id)}`} detail={`Paid ${row.payment_date}`} amount={format(row.amount_minor)} status={row.status} action={row.status==='pending'&&row.recipient_id===mine?.member_id?'Review payment':'View details'} onPress={()=>{setError(null);setMessage('');setDecision({id:row.id,confirm:true});}}/>)}
    </>:null}
   </>:null}
  </>}
 </HouseholdSheet>;
}
