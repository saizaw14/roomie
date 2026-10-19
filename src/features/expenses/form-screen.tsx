import { currencyInfo } from '@/utils/currencies';
import { router,useLocalSearchParams } from 'expo-router';
import { useRef,useState } from 'react';
import { Text,View,Pressable } from 'react-native';
import { useForm,useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation,useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormInput } from '@/features/auth/components/form-input';
import { useHouseholds } from '@/features/households/use-households';
import { useAuth } from '@/lib/auth-context';
import type { listMembers } from '@/features/households/api';
import type { getExpense } from './api';
import { saveExpense } from './api';
import { useExpense,useExpenseMembers } from './hooks';
import { categories,isExpenseId,decimal as currencyDecimal,localToday,money as formatMoney,parseMinor as parseAmount,parseBps,splitExpense,type SplitMethod,type Allocation } from './domain';
import { expenseError,makeExpenseSchema,type ExpenseValues } from './validation';
import { ExpenseScreen,ExpenseCard,Choice,Avatar,Row,Status,Icon,s } from './ui';
type Members=Awaited<ReturnType<typeof listMembers>>;
type Detail=Awaited<ReturnType<typeof getExpense>>;
export function ExpenseFormScreen({editing=false}:{editing?:boolean}) {
 const params=useLocalSearchParams<{id?:string;household?:string}>();const id=typeof params.id==='string'?params.id:'';
 const detail=useExpense(editing?id:'');const houses=useHouseholds();
 const house=editing?detail.data?.expense.household_id:(typeof params.household==='string'?params.household:houses.current?.id);
 const members=useExpenseMembers(house??'');const {session}=useAuth();
 const membership=houses.data?.memberships.find(m=>m.household_id===house&&m.user_id===session?.user.id);
 const permitted=!editing||(detail.data?.expense.status==='posted'&&(detail.data.expense.created_by===session?.user.id||membership?.role==='owner'));
 if(editing&&!isExpenseId(id)) return <ExpenseScreen title="Invalid expense link" sheet><Text style={s.error}>Open an expense from the expense list.</Text></ExpenseScreen>;
 if(houses.isError||members.isError||(editing&&detail.isError)) return <ExpenseScreen title="Expense unavailable" sheet><Text accessibilityRole="alert" style={s.error}>{expenseError(houses.error??members.error??detail.error)}</Text><Button label="Retry" onPress={()=>{void houses.refetch();void members.refetch();if(editing) void detail.refetch();}}/></ExpenseScreen>;
 if(!house||!members.data||houses.isPending||(editing&&!detail.data)) return <ExpenseScreen title="Expense" sheet><Text style={s.small}>{houses.isSuccess&&!house?'Create or join a household first.':'Loading expense…'}</Text></ExpenseScreen>;
 if(!permitted||!membership) return <ExpenseScreen title="Expense unavailable" sheet><Text style={s.body}>Only the creator or owner can edit a posted expense.</Text></ExpenseScreen>;
 if(editing&&detail.data!.payers.length!==1) return <ExpenseScreen title="Multiple payers" sheet><Text style={s.body}>This expense has multiple payers. The current editor supports one payer, so it cannot safely edit this record.</Text></ExpenseScreen>;
 return <ExpenseForm key={`${house}:${id}`} household={house} currency={detail.data?.expense.currency??houses.houses.find(h=>h.id===house)?.currency??'MYR'} members={members.data} original={editing?detail.data:undefined}/>;
}
function ExpenseForm({household,currency,members,original}:{household:string;currency:string;members:Members;original?:Detail}) {
 const decimal=(value:number)=>currencyDecimal(value,currency);const money=(value:number)=>formatMoney(value,currency);const parseMinor=(input:string,allowZero=false)=>parseAmount(input,allowZero,currency);
 const {session}=useAuth();const client=useQueryClient();const active=members.filter(m=>m.status==='active');
 const [savedId,setSavedId]=useState<string|null>(null);
 const [step,setStep]=useState(1);const [method,setMethod]=useState<SplitMethod>(original?.expense.split_method??'equal');
 const [selected,setSelected]=useState<string[]>(()=>original?original.splits.filter(p=>active.some(m=>m.id===p.member_id)).map(p=>p.member_id):active.map(m=>m.id));
 const [allocations,setAllocations]=useState<Record<string,string>>(()=>Object.fromEntries(original?.splits.map(p=>[p.member_id,original.expense.split_method==='percentage'?currencyDecimal(p.percentage_bps??0,'MYR'):decimal(p.owed_minor)])??[]));
 const [error,setError]=useState<string|null>(null);const [request]=useState(()=>`${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`);const lock=useRef(false);
 const {control,handleSubmit,getValues,setValue,formState:{errors}}=useForm<ExpenseValues>({resolver:zodResolver(makeExpenseSchema(currency)),mode:'onBlur',defaultValues:{title:original?.expense.title??'',amount:original?decimal(original.expense.amount_minor):'',category:(original?.expense.category??'Groceries') as ExpenseValues['category'],date:original?.expense.expense_date??localToday(),notes:original?.expense.notes??'',payer:original?.payers[0].member_id??active.find(m=>m.user_id===session?.user.id)?.id??active[0]?.id??''}});
 const values=useWatch({control}) as ExpenseValues;let shares:ReturnType<typeof splitExpense>=[];let splitError:string|null=null;let participants:Allocation[]=[];
 try {participants=selected.map(member_id=>({member_id,...(method==='equal'?{}:{value:method==='exact'?parseMinor(allocations[member_id]??'',true):parseBps(allocations[member_id]??'')})}));shares=splitExpense(parseMinor(values.amount),method,participants);}catch(failure){splitError=expenseError(failure);}
 const mutation=useMutation({mutationFn:()=>saveExpense(household,getValues(),method,participants,request,original?.expense,currency),retry:false,onSuccess:async id=>{await Promise.all([client.invalidateQueries({queryKey:['settlements']}),client.invalidateQueries({queryKey:['activity']}),client.invalidateQueries({queryKey:['expenses']}),client.invalidateQueries({queryKey:['expense']})]);setSavedId(id);}});
 const busy=mutation.isPending;const name=(id:string)=>members.find(m=>m.id===id)?.display_name??'Household member';
 function changeMethod(next:SplitMethod) {setMethod(next);setError(null);if(next!=='equal'&&Object.keys(allocations).length===0&&selected.length) {let amount=0;try{amount=next==='percentage'?10000:parseMinor(getValues().amount);}catch{};const rows=splitExpense(Math.max(1,amount),'equal',selected.map(member_id=>({member_id})));setAllocations(Object.fromEntries(rows.map(p=>[p.member_id,next==='percentage'?currencyDecimal(p.owed_minor,'MYR'):decimal(p.owed_minor)])));}}
 async function save() {if(lock.current||busy)return;setError(null);if(splitError){setError(splitError);return;}lock.current=true;try{await mutation.mutateAsync();}catch(failure){setError(expenseError(failure));}finally{lock.current=false;}}
 const move=handleSubmit(()=>{setError(null);if(selected.length===0){setError('Select at least one participant.');return;}if(!active.some(m=>m.id===getValues().payer)){setError('Choose an active payer.');return;}setStep(2);});
 if(savedId) return <ExpenseScreen sheet title={original?'Expense updated':'Expense posted'}><View style={{alignItems:'center',gap:14,paddingVertical:30}}><View style={[s.avatar,{width:64,height:64,borderRadius:22}]}><Icon name="check"/></View><Text style={s.heading}>{values.title} {original?'updated':'added'}</Text><Text style={s.small}>{money(parseMinor(values.amount))} was split between {selected.length} participants. The expense and its history are saved.</Text><Button appearance="auth" label="View expense" onPress={()=>router.replace({pathname:'/expenses/[id]',params:{id:savedId}})}/><Button appearance="auth" variant="secondary" label="Back to expenses" onPress={()=>router.replace('/expenses')}/></View></ExpenseScreen>;
 return <ExpenseScreen sheet title={step===1?(original?'Edit expense':'Add expense'):step===2?'Edit split':'Review expense'} subtitle={`Step ${step} of 3`}>
  {original?.splits.some(p=>!active.some(m=>m.id===p.member_id))?<Text style={s.note}>A previous participant has left. Editing replaces the split with selected active members; the earlier allocation remains in history.</Text>:null}
  {step===1?<>
   <FormInput appearance="auth" control={control} name="title" label="Title" placeholder="Groceries" editable={!busy}/>
   <FormInput appearance="auth" control={control} name="amount" label={`Amount (${currency})`} placeholder={currencyInfo(currency).decimals===0?'100':`100.${'0'.repeat(currencyInfo(currency).decimals)}`} keyboardType="decimal-pad" editable={!busy}/>
   <Text style={s.small}>Category</Text><View style={s.wrap}>{categories.map(c=><Choice key={c} label={c} selected={values.category===c} onPress={()=>setValue('category',c,{shouldValidate:true})}/>)}</View>
   <FormInput appearance="auth" control={control} name="date" label="Date (YYYY-MM-DD)" placeholder="2026-10-12" editable={!busy}/>
   <Text style={s.small}>Paid by</Text><View style={s.wrap}>{active.map(m=><Choice key={m.id} label={`${m.display_name}${m.user_id===session?.user.id?' (you)':''}`} selected={values.payer===m.id} onPress={()=>setValue('payer',m.id,{shouldValidate:true})}/>)}</View>{errors.payer?<Text style={s.error}>{errors.payer.message}</Text>:null}
   <Text style={s.bold}>Split with · {selected.length} selected</Text><View style={s.wrap}>{active.map(m=><Pressable key={m.id} accessibilityRole="checkbox" accessibilityState={{checked:selected.includes(m.id)}} onPress={()=>setSelected(ids=>ids.includes(m.id)?ids.filter(id=>id!==m.id):[...ids,m.id])} style={[s.chip,{minWidth:76,alignItems:'center',gap:5},selected.includes(m.id)&&s.selected]}><Avatar name={m.display_name}/><Text style={s.small}>{m.display_name}</Text>{selected.includes(m.id)?<Icon name="check"/>:null}</Pressable>)}</View>
   <FormInput appearance="auth" control={control} name="notes" label="Notes (optional)" multiline maxLength={1000} editable={!busy}/>
   <Button appearance="auth" label="Continue to split" onPress={()=>void move()}/>
  </>:step===2?<>
   <View style={s.wrap}>{(['equal','exact','percentage'] as const).map(m=><Choice key={m} label={m[0].toUpperCase()+m.slice(1)} selected={method===m} onPress={()=>changeMethod(m)}/>)}</View>
   <View style={s.allocation}><Text style={s.small}>Total allocated</Text><Text style={s.title}>{splitError?'Check allocations':money(shares.reduce((sum,p)=>sum+p.owed_minor,0))}</Text><Text style={s.small}>{splitError??`${money(0)} remaining`}</Text></View>
   <ExpenseCard>{selected.map(id=><View key={id} style={s.memberRow}><Avatar name={name(id)}/><Text style={[s.bold,{flex:1}]}>{name(id)}</Text>{method==='equal'?<Text style={s.bold}>{money(shares.find(p=>p.member_id===id)?.owed_minor??0)}</Text>:<View style={{width:105}}><Input appearance="auth" label={method==='exact'?`Share (${currency})`:'Share (%)'} value={allocations[id]??''} onChangeText={value=>setAllocations(a=>({...a,[id]:value}))} keyboardType="decimal-pad"/></View>}</View>)}</ExpenseCard>
   {method==='equal'?<Text style={s.note}>Any rounding remainder goes to participants in stable membership order.</Text>:method==='percentage'?<Text style={s.note}>Percentages must total 100.00%. Rounding remainders go to the largest fractional shares, then membership order.</Text>:null}
   <View style={s.dual}><Button appearance="auth" label="Back" variant="secondary" onPress={()=>setStep(1)}/><Button appearance="auth" label="Review expense" disabled={!!splitError} onPress={()=>setStep(3)}/></View>
  </>:<>
   <Text style={s.small}>Total</Text><Text style={s.total}>{money(parseMinor(values.amount))}</Text><Status status="Ready to post"/>
   <ExpenseCard><Row label="Title" value={values.title}/><Row label="Paid by" value={name(values.payer)}/><Row label="Date" value={values.date}/><Row label="Category" value={values.category}/><Row label="Split" value={`${method} · ${selected.length} people`}/>{values.notes?<Row label="Notes" value={values.notes}/>:null}</ExpenseCard>
   <Text style={s.heading}>Shares</Text><ExpenseCard>{shares.map(p=><View key={p.member_id} style={s.memberRow}><Avatar name={name(p.member_id)}/><Text style={[s.bold,{flex:1}]}>{name(p.member_id)}</Text><Text style={s.bold}>{money(p.owed_minor)}</Text></View>)}</ExpenseCard>
   <Text style={s.note}>Saving posts the expense and records its revision history. Balance summaries arrive in milestone 5.</Text>
   <View style={s.dual}><Button appearance="auth" label="Edit split" variant="secondary" disabled={busy} onPress={()=>setStep(2)}/><Button appearance="auth" label={original?'Save changes':'Save expense'} loading={busy} onPress={()=>void save()}/></View>
  </>}
  {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
 </ExpenseScreen>;
}
