import { Link,useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useMutation,useQueryClient } from '@tanstack/react-query';
import { Text,View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { useHouseholds } from '@/features/households/use-households';
import { useExpense,useExpenseMembers } from './hooks';
import { voidExpense } from './api';
import { expenseError } from './validation';
import { money,safeMinor,isExpenseId } from './domain';
import { ExpenseScreen,ExpenseCard,Row,Avatar,Status,Choice,Icon,s } from './ui';
export function ExpenseDetailScreen() {
 const params=useLocalSearchParams<{id?:string}>();const id=typeof params.id==='string'?params.id:'';const query=useExpense(id);
 const {session}=useAuth();const houses=useHouseholds();const members=useExpenseMembers(query.data?.expense.household_id??'');const client=useQueryClient();
 const [confirm,setConfirm]=useState(false);const [reason,setReason]=useState('');const [error,setError]=useState<string|null>(null);const [expanded,setExpanded]=useState<number|null>(null);
 const mutation=useMutation({mutationFn:()=>voidExpense(query.data!.expense,reason),retry:false,onSuccess:async()=>{setConfirm(false);await Promise.all([client.invalidateQueries({queryKey:['activity']}),client.invalidateQueries({queryKey:['expenses']}),client.invalidateQueries({queryKey:['expense']})]);}});
 const e=query.data?.expense;const name=(member:string)=>members.data?.find(m=>m.id===member)?.display_name??'Former household member';
 const actor=(user:string)=>members.data?.find(m=>m.user_id===user)?.display_name??'Household member';
 const allowed=e?.status==='posted'&&(e.created_by===session?.user.id||houses.data?.memberships.some(m=>m.household_id===e.household_id&&m.user_id===session?.user.id&&m.role==='owner'));
 async function confirmVoid(){setError(null);try{await mutation.mutateAsync();}catch(failure){setError(expenseError(failure));}}
 return <ExpenseScreen title="Expense details" subtitle={e?`Posted ${e.expense_date} · ${actor(e.created_by)}`:undefined} sheet>
  {!isExpenseId(id)?<Text style={s.error}>Invalid expense link.</Text>:query.isPending?<Text style={s.small}>Loading expense…</Text>:query.isError?<><Text accessibilityRole="alert" style={s.error}>{expenseError(query.error)}</Text><Button label="Retry" onPress={()=>void query.refetch()}/></>:null}
  {e&&query.data?<>
   <View style={{alignItems:'center',gap:8}}><View style={[s.avatar,{width:42,height:42,borderRadius:13}]}><Icon name={e.category==='Groceries'?'groceries':e.category==='Utilities'?'bolt':e.category==='Rent'?'building':'receipt'}/></View><Status status={e.status}/><Text style={s.heading}>{e.title}</Text><Text style={s.total}>{money(e.amount_minor)}</Text><Text style={s.small}>{e.status==='void'?'This expense is excluded from posted spending.':members.isSuccess?`Your share · ${money(query.data.splits.find(p=>members.data?.find(m=>m.id===p.member_id)?.user_id===session?.user.id)?.owed_minor??0)}`:'Your share is loading or unavailable'}</Text></View>
   <ExpenseCard>{query.data.payers.map(p=><Row key={p.member_id} label={`Paid by ${name(p.member_id)}`} value={money(p.paid_minor)}/>)}<Row label="Date" value={e.expense_date}/><Row label="Category" value={e.category}/><Row label="Split method" value={e.split_method}/>{e.notes?<Row label="Notes" value={e.notes}/>:null}{e.void_reason?<Row label="Void reason" value={e.void_reason}/>:null}</ExpenseCard>
   <Text style={s.heading}>Participant shares</Text><ExpenseCard>{query.data.splits.map(p=><View key={p.member_id} style={s.memberRow}><Avatar name={name(p.member_id)}/><View style={{flex:1}}><Text style={s.bold}>{name(p.member_id)}</Text>{p.percentage_bps!==null?<Text style={s.small}>{(p.percentage_bps/100).toFixed(2)}%</Text>:null}</View><Text style={s.bold}>{money(p.owed_minor)}</Text></View>)}</ExpenseCard>
   <Text style={s.heading}>History</Text>{query.data.revisions.map(r=><ExpenseCard key={r.version}><View style={s.row}><Icon name="history"/><View style={{flex:1}}><Text style={s.bold}>{r.action} · version {r.version}</Text><Text style={s.small}>{actor(r.actor_id)} · {new Date(r.created_at).toLocaleString()}</Text></View><Choice label={expanded===r.version?'Hide':'View'} selected={expanded===r.version} onPress={()=>setExpanded(v=>v===r.version?null:r.version)}/></View>{expanded===r.version?<RevisionContent snapshot={r.snapshot} name={name}/>:null}</ExpenseCard>)}
   {allowed&&!confirm?<View style={s.dual}><Link href={{pathname:'/expenses/edit',params:{id:e.id}}} asChild><Button appearance="auth" variant="secondary" label="Edit expense"/></Link><Button appearance="auth" variant="secondary" label="Void expense" onPress={()=>setConfirm(true)}/></View>:null}
   {confirm?<ExpenseCard><Text style={s.heading}>Void this expense?</Text><Text style={s.small}>This removes it from posted spending. Shares and all revisions remain in history. Voiding cannot be undone.</Text><Input appearance="auth" label="Reason" value={reason} onChangeText={setReason} maxLength={500} editable={!mutation.isPending}/><View style={s.dual}><Button appearance="auth" variant="secondary" label="Cancel" disabled={mutation.isPending} onPress={()=>setConfirm(false)}/><Button appearance="auth" label="Confirm void" loading={mutation.isPending} disabled={!reason.trim()} onPress={()=>void confirmVoid()}/></View></ExpenseCard>:null}
   {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
   <Button appearance="auth" variant="secondary" label="Refresh details" loading={query.isFetching} disabled={mutation.isPending} onPress={()=>void query.refetch()}/>
  </>:null}
 </ExpenseScreen>;
}

function RevisionContent({snapshot,name}:{snapshot:unknown;name:(id:string)=>string}) {
 const object=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
 const record=object(snapshot);const expense=object(record.expense);
 const text=(value:unknown)=>typeof value==='string'?value:'';
 const format=(value:unknown)=>{try{return money(safeMinor(typeof value==='number'||typeof value==='string'?value:'invalid'));}catch{return 'Unavailable';}};
 const payers=Array.isArray(record.payers)?record.payers:[];const shares=Array.isArray(record.splits)?record.splits:[];
 return <View><Row label="Title" value={text(expense.title)}/><Row label="Amount" value={format(expense.amount_minor)}/><Row label="Date" value={text(expense.expense_date)}/><Row label="Category" value={text(expense.category)}/><Row label="Split" value={text(expense.split_method)}/><Row label="Status" value={text(expense.status)}/>
  {text(expense.notes)?<Row label="Notes" value={text(expense.notes)}/>:null}
  {payers.map((value,i)=>{const p=object(value);return <Row key={i} label={`Paid by ${name(text(p.member_id))}`} value={format(p.paid_minor)}/>;})}
  {shares.map((value,i)=>{const p=object(value);return <Row key={i} label={`${name(text(p.member_id))} owes`} value={format(p.owed_minor)}/>;})}
  {text(expense.void_reason)?<Row label="Void reason" value={text(expense.void_reason)}/>:null}
 </View>;
}
