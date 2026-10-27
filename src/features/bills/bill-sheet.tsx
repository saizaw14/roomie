import { palette as appPalette } from '@/theme/palette';
import { useState } from 'react';
import { Link } from 'expo-router';
import { Modal,Text,View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { useMutation,useQueryClient } from '@tanstack/react-query';
import { requireSupabase } from '@/lib/supabase';
import { HouseholdSheet } from '@/features/households/household-sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Choice,CategoryChoice,Icon,Row } from '@/features/expenses/ui';
import { DateRangeCalendar } from '@/features/expenses/date-range-calendar';
import { categories,decimal,localToday,money,parseMinor,validDate } from '@/features/expenses/domain';
import { DashboardIcon } from '@/features/dashboard/components';
import type { Household,Membership } from '@/types/database';
import { type Bill,billError } from './api';
import { styles as s } from './styles';
type Member=Membership&{display_name:string};
export function BillSheet({bill,house,members,owner,onClose}:{bill:Bill|null;house:Household;members:Member[];owner:boolean;onClose:()=>void}){
 const client=useQueryClient();const active=members.filter(m=>m.status==='active');
 const [title,setTitle]=useState(bill?.title??'');const [category,setCategory]=useState(bill?.category??'Utilities');
 const [variable,setVariable]=useState(bill?.amount_minor==null);const [amount,setAmount]=useState(bill?.amount_minor!=null?decimal(bill.amount_minor,house.currency):'');
 const [frequency,setFrequency]=useState<'weekly'|'monthly'>(bill?.frequency??'monthly');const [due,setDue]=useState(bill?.next_due_date??localToday());
 const [paidDate,setPaidDate]=useState(localToday());const [payer,setPayer]=useState(bill?.payer_id??'');const [participants,setParticipants]=useState<string[]>(bill?.participants??active.map(m=>m.id));
 const [picker,setPicker]=useState<'due'|'paid'|'payer'|'participants'|null>(null);const [error,setError]=useState('');const [result,setResult]=useState<{expense?:string}|null>(null);
 const [request]=useState(()=>`bill-${Date.now()}-${Math.random().toString(36).slice(2)}`);
 const [locked,setLocked]=useState(false);
 const refresh=async()=>{await Promise.all(['bills','expenses','settlements','activity'].map(key=>client.invalidateQueries({queryKey:[key]})));};
 const save=useMutation({mutationFn:async()=>{
  const finalAmount=!bill&&variable?null:parseMinor(amount,false,house.currency);
  if(!payer||!active.some(m=>m.id===payer)||!participants.length||participants.some(id=>!active.some(m=>m.id===id)))throw new Error('Choose an active payer and participants.');
  if(bill){if(!validDate(paidDate)||paidDate>localToday())throw new Error('Choose a payment date on or before today.');}
  else if(!title.trim()||title.trim().length>120||!validDate(due)||due>'2100-11-30')throw new Error('Enter a bill name and due date before December 2100.');
  setLocked(true);
  if(bill){const {data,error}=await requireSupabase().rpc('roomie_post_bill',{p_id:bill.id,p_due:bill.next_due_date,p_amount:finalAmount!,p_paid_date:paidDate,p_payer:payer,p_members:participants});if(error)throw error;return {expense:data};}
  const {error}=await requireSupabase().rpc('roomie_create_bill',{p_household:house.id,p_title:title.trim(),p_category:category,p_amount:finalAmount,p_frequency:frequency,p_due:due,p_payer:payer,p_members:participants,p_request:request});if(error)throw error;return {};
 },onSuccess:async data=>{setResult(data);await refresh();},onError:e=>setError(billError(e))});
 const pause=useMutation({mutationFn:async()=>{if(!bill)return;const {error}=await requireSupabase().rpc('roomie_set_bill_active',{p_id:bill.id,p_active:!bill.active,p_version:bill.version});if(error)throw error;},onSuccess:async()=>{await refresh();onClose();},onError:e=>setError(billError(e))});
 const busy=save.isPending||pause.isPending;
 const name=(id:string)=>members.find(m=>m.id===id)?.display_name??'Former household member';
 const dateLabel=(value:string)=>new Date(value+'T12:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
 let preview:number|null=null;try{preview=parseMinor(amount,false,house.currency);}catch{}
 return <Modal transparent animationType="fade" onRequestClose={()=>{if(!busy)onClose();}}><HouseholdSheet title={result?(bill?'Expense posted':'Bill created'):bill?'Review bill occurrence':'Add recurring bill'} subtitle={bill?`${bill.title} · Due ${dateLabel(bill.next_due_date)}`:'Set up a household reminder'} busy={busy} onClose={onClose}>
  {result?<View style={s.success}><View style={s.successIcon}><Icon name="check" color={appPalette.success}/></View><Text style={s.name}>{bill?`${bill.title} posted`:`${title.trim()} created`}</Text><Text style={s.small}>{bill?'This occurrence is linked to an expense and cannot be posted twice.':`The first reminder is due ${dateLabel(due)}. It won’t affect balances until someone reviews and posts it.`}</Text>{result.expense?<Link href={{pathname:'/expenses/[id]',params:{id:result.expense}}} asChild><Button appearance="auth" label="View expense"/></Link>:null}<Button appearance="auth" variant="secondary" style={s.secondary} labelStyle={s.secondaryText} label={bill?'Done':'View bills'} onPress={onClose}/></View>:<>
   {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
   {!bill?<>
    <Input appearance="auth" label="Bill name" placeholder="e.g. Electricity" value={title} onChangeText={setTitle} maxLength={120} editable={!locked}/>
    <View style={s.segmented}>{[true,false].map(value=><Pressable key={String(value)} accessibilityRole="button" accessibilityState={{selected:variable===value}} disabled={locked} onPress={()=>setVariable(value)} style={[s.segment,variable===value&&s.selected]}><Text style={[s.segmentText,variable===value&&s.selectedText]}>{value?'Variable amount':'Fixed amount'}</Text></Pressable>)}</View>
    {variable?<View style={s.info}><Icon name="bolt" color={appPalette.info}/><Text style={s.infoText}>You’ll enter the real amount each time this bill is posted.</Text></View>:<Input appearance="auth" label={`Amount (${house.currency})`} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} editable={!locked} placeholder="0"/>}
    <Text style={s.label}>Category</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{categories.map(value=><CategoryChoice key={value} label={value} selected={category===value} disabled={locked} onPress={()=>setCategory(value)}/>)}</View>
    <Text style={s.label}>Frequency</Text><View style={s.segmented}>{(['weekly','monthly'] as const).map(value=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:frequency===value}} disabled={locked} onPress={()=>setFrequency(value)} style={[s.segment,frequency===value&&s.selected]}><Text style={[s.segmentText,frequency===value&&s.selectedText]}>{value==='weekly'?'Weekly':'Monthly'}</Text></Pressable>)}</View>
    <Select label="Next due" value={dateLabel(due)} disabled={locked} onPress={()=>setPicker(picker==='due'?null:'due')}/>
    {picker==='due'?<DateRangeCalendar single start={due} end={due} onChange={range=>{setDue(range.start);setPicker(null);}}/>:null}
   </>:<>
    {bill.next_due_date<localToday()?<View style={s.warning}><Text style={s.small}>This reminder is overdue. That does not necessarily mean the bill is unpaid.</Text></View>:null}
    {!bill.active?<View style={s.warning}><Text style={s.small}>This bill is paused. No future reminders are active. The owner can resume it from its saved due date.</Text></View>:null}
    <Input appearance="auth" label={`Final amount (${house.currency})`} placeholder="0" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} editable={!locked&&bill.active}/>
    <Select label="Payment date" value={dateLabel(paidDate)} disabled={locked||!bill.active} onPress={()=>setPicker(picker==='paid'?null:'paid')}/>
    {picker==='paid'?<DateRangeCalendar single start={paidDate} end={paidDate} onChange={range=>{setPaidDate(range.start);setPicker(null);}}/>:null}
   </>}
   <Select label="Paid by" value={payer?name(payer):'Choose a payer'} disabled={locked} onPress={()=>setPicker(picker==='payer'?null:'payer')}/>
   {picker==='payer'?<View style={s.choices}>{active.map(m=><Choice key={m.id} label={m.display_name} selected={payer===m.id} disabled={locked} onPress={()=>{setPayer(m.id);setPicker(null);}}/>)}</View>:null}
   <Select label="Participants" value={`${participants.length} ${participants.length===1?'person':'people'} · Equal split`} disabled={locked} onPress={()=>setPicker(picker==='participants'?null:'participants')}/>
   {picker==='participants'?<View style={s.choices}>{members.map(m=><Choice key={m.id} label={`${m.display_name}${m.status==='left'?' (left household)':''}`} selected={participants.includes(m.id)} disabled={locked} onPress={()=>setParticipants(ids=>ids.includes(m.id)?ids.filter(id=>id!==m.id):m.status==='active'?[...ids,m.id]:ids)}/>)}</View>:null}
   {bill?<View><Row label="Paid by" value={payer?name(payer):'Choose a payer'}/><Row label="Participants" value={`${participants.length} people`}/><Row label="Split" value="Equal"/>{preview!==null&&participants.length?<Row label="Estimated share" value={`${money(Math.floor(preview/participants.length),house.currency)}${preview%participants.length?' + rounding remainder':''}`}/>:null}</View>:null}
   <Text style={s.note}>{bill?'Only post a payment that has actually been made. Posting creates an expense and updates balances.':'Reminders have no balance effect. Monthly dates use the last day of shorter months and retain the original day for later months.'}</Text>
   {!bill||bill.active?<Button appearance="auth" label={locked?'Retry same request':bill?'Review & post expense':'Create recurring bill'} loading={save.isPending} disabled={pause.isPending||(!bill&&!owner)} onPress={()=>{setError('');save.mutate();}}/>:null}
   {locked&&!busy?<Text style={s.note}>If the result is uncertain, retry the same details. Close and check Bills or Expenses before starting again.</Text>:null}
   {bill&&owner?<Button appearance="auth" variant="secondary" style={s.secondary} labelStyle={s.secondaryText} label={bill.active?'Pause recurring bill':'Resume recurring bill'} disabled={locked||save.isPending} loading={pause.isPending} onPress={()=>{setError('');pause.mutate();}}/>:null}
  </>}
 </HouseholdSheet></Modal>;
}
function Select({label,value,disabled,onPress}:{label:string;value:string;disabled:boolean;onPress:()=>void}){return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={s.select}><View style={s.selectCopy}><Text style={s.label}>{label}</Text><Text style={s.bold}>{value}</Text></View><DashboardIcon name="chevron"/></Pressable>;}
