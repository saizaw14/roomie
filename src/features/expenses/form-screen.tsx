import { categoryIconName } from './category-icons';
import { categoryColor } from '@/theme/category-colors';
import { palette as appPalette } from '@/theme/palette';
import { currencyInfo } from '@/utils/currencies';
import { router,useLocalSearchParams } from 'expo-router';
import { useRef,useState } from 'react';
import { Text,View,TextInput } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { Image } from 'expo-image';
import { DashboardIcon } from '@/features/dashboard/components';
import { DateRangeCalendar } from './date-range-calendar';
import { ExpenseFormSheet,SelectField,MemberAvatar,x } from './form-ui';
import { useForm,useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation,useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/features/auth/components/form-input';
import { useHouseholds } from '@/features/households/use-households';
import { useAuth } from '@/lib/auth-context';
import type { listMembers } from '@/features/households/api';
import type { getExpense } from './api';
import { saveExpense } from './api';
import { useExpense,useExpenseMembers } from './hooks';
import { categories,isExpenseId,decimal as currencyDecimal,localToday,money as formatMoney,parseMinor as parseAmount,parseBps,splitExpense,type SplitMethod,type Allocation } from './domain';
import { expenseError,makeExpenseSchema,type ExpenseValues } from './validation';
import { Row,Icon,icons,s } from './ui';
type Members=Awaited<ReturnType<typeof listMembers>>;
type Detail=Awaited<ReturnType<typeof getExpense>>;
export function ExpenseFormScreen({editing=false}:{editing?:boolean}) {
 const params=useLocalSearchParams<{id?:string;household?:string}>();const id=typeof params.id==='string'?params.id:'';
 const detail=useExpense(editing?id:'');const houses=useHouseholds();
 const house=editing?detail.data?.expense.household_id:(typeof params.household==='string'?params.household:houses.current?.id);
 const members=useExpenseMembers(house??'');const {session}=useAuth();
 const membership=houses.data?.memberships.find(m=>m.household_id===house&&m.user_id===session?.user.id);
 const permitted=!editing||(detail.data?.expense.status==='posted'&&(detail.data.expense.created_by===session?.user.id||membership?.role==='owner'));
 if(editing&&!isExpenseId(id)) return <ExpenseFormSheet title="Invalid expense link"><Text style={s.error}>Open an expense from the expense list.</Text></ExpenseFormSheet>;
 if(houses.isError||members.isError||(editing&&detail.isError)) return <ExpenseFormSheet title="Expense unavailable"><Text accessibilityRole="alert" style={s.error}>{expenseError(houses.error??members.error??detail.error)}</Text><Button label="Retry" onPress={()=>{void houses.refetch();void members.refetch();if(editing) void detail.refetch();}}/></ExpenseFormSheet>;
 if(!house||!members.data||houses.isPending||(editing&&!detail.data)) return <ExpenseFormSheet title="Expense"><Text style={s.small}>{houses.isSuccess&&!house?'Create or join a household first.':'Loading expense…'}</Text></ExpenseFormSheet>;
 if(!permitted||!membership) return <ExpenseFormSheet title="Expense unavailable"><Text style={s.body}>Only the creator or owner can edit a posted expense.</Text></ExpenseFormSheet>;
 if(editing&&detail.data!.payers.length!==1) return <ExpenseFormSheet title="Multiple payers"><Text style={s.body}>This expense has multiple payers. The current editor supports one payer, so it cannot safely edit this record.</Text></ExpenseFormSheet>;
 return <ExpenseForm key={`${house}:${id}`} household={house} currency={detail.data?.expense.currency??houses.houses.find(h=>h.id===house)?.currency??'MYR'} members={members.data} original={editing?detail.data:undefined}/>;
}
function ExpenseForm({household,currency,members,original}:{household:string;currency:string;members:Members;original?:Detail}) {
 const decimal=(value:number)=>currencyDecimal(value,currency);const money=(value:number)=>formatMoney(value,currency);const parseMinor=(input:string,allowZero=false)=>parseAmount(input,allowZero,currency);
 const {session}=useAuth();const client=useQueryClient();const active=members.filter(m=>m.status==='active');
 const [picker,setPicker]=useState<'category'|'date'|'payer'|null>(null);
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
 const avatarIndex=(id:string)=>Math.max(0,active.findIndex(m=>m.id===id));
 const isYou=(id:string)=>members.find(m=>m.id===id)?.user_id===session?.user.id;
 const dateLabel=new Date(`${values.date}T12:00:00`).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
 const methodLabel=method[0].toUpperCase()+method.slice(1);
 let amount=0;try{amount=parseMinor(values.amount);}catch{}
 let allocated:number|null=0;
 try{allocated=method==='equal'?amount:selected.reduce((sum,id)=>sum+(method==='percentage'?parseBps(allocations[id]||'0'):parseMinor(allocations[id]||'0',true)),0);}catch{allocated=null;}
 const target=method==='percentage'?10000:amount;
 const remaining=allocated===null?null:target-allocated;
 const allocationLabel=allocated===null?'Check shares':method==='percentage'?`${currencyDecimal(allocated,'MYR')}%`:money(allocated);
 const remainingLabel=remaining===null?'Enter a valid share for each participant.':`${method==='percentage'?currencyDecimal(Math.abs(remaining),'MYR')+'%':money(Math.abs(remaining))} ${remaining<0?'overallocated':'remaining'}`;
 if(savedId) return <ExpenseFormSheet title={original?'Expense updated':'Expense posted'}><View style={x.success}><View style={x.successIcon}><Icon name="check" color={appPalette.success}/></View><Text style={x.successTitle}>{values.title} {original?'updated':'added'}</Text><Text style={x.successText}>{money(parseMinor(values.amount))} was split between {selected.map(name).join(', ')}. The expense and updated balances are saved.</Text><Button appearance="auth" label="Back to home" onPress={()=>router.replace('/home')}/><Button appearance="auth" style={x.secondary} labelStyle={x.secondaryLabel} variant="secondary" label="View expense" onPress={()=>router.replace({pathname:'/expenses/[id]',params:{id:savedId}})}/></View></ExpenseFormSheet>;
 return <ExpenseFormSheet title={step===1?(original?'Edit expense':'Add expense'):step===2?'Edit split':'Review expense'} subtitle={`Step ${step} of 3`} busy={busy}>
  {original?.splits.some(p=>!active.some(m=>m.id===p.member_id))?<Text style={s.note}>A previous participant has left. Editing replaces the split with selected active members; the earlier allocation remains in history.</Text>:null}
  {step===1?<>
   <FormInput appearance="auth" containerStyle={{marginBottom:0}} control={control} name="title" label="Title" placeholder="e.g. Groceries" editable={!busy}/>
   <FormInput appearance="auth" containerStyle={{marginBottom:0}} control={control} name="amount" label="Amount" prefix={currency==='MYR'?'RM':currency} style={x.amount} placeholder={currencyInfo(currency).decimals===0?'0':`0.${'0'.repeat(currencyInfo(currency).decimals)}`} keyboardType="decimal-pad" editable={!busy}/>
   <View style={x.fieldGrid}><View style={x.half}><SelectField label="Category" value={values.category} expanded={picker==='category'} onPress={()=>setPicker(picker==='category'?null:'category')}/></View><View style={x.half}><SelectField label="Date" value={dateLabel} expanded={picker==='date'} onPress={()=>setPicker(picker==='date'?null:'date')}/></View></View>
   {picker==='category'?<View style={x.options}>{categories.map((category,index)=><Pressable key={category} accessibilityRole="radio" accessibilityState={{checked:values.category===category}} onPress={()=>{setValue('category',category,{shouldValidate:true});setPicker(null);}} style={[x.option,index>0&&x.divider,{backgroundColor:categoryColor(category).background}]}><Icon name={categoryIconName(category)} color={categoryColor(category).foreground}/><Text style={[x.value,{flex:1,color:categoryColor(category).foreground}]}>{category}</Text>{values.category===category?<Icon name="check"/>:null}</Pressable>)}</View>:null}
   {picker==='date'?<DateRangeCalendar single start={values.date} end={values.date} onChange={range=>{setValue('date',range.start,{shouldValidate:true});setPicker(null);}}/>:null}
   {errors.date?<Text accessibilityRole="alert" style={s.error}>{errors.date.message}</Text>:null}
   <SelectField label="Paid by" value={`${name(values.payer)}${isYou(values.payer)?' (you)':''}`} leading={<MemberAvatar name={name(values.payer)} index={avatarIndex(values.payer)} small/>} expanded={picker==='payer'} onPress={()=>setPicker(picker==='payer'?null:'payer')}/>
   {picker==='payer'?<View style={x.options}>{active.map((member,index)=><Pressable key={member.id} accessibilityRole="radio" accessibilityState={{checked:values.payer===member.id}} onPress={()=>{setValue('payer',member.id,{shouldValidate:true});setPicker(null);}} style={[x.option,index>0&&x.divider,values.payer===member.id&&x.optionSelected]}><MemberAvatar name={member.display_name} index={index} small/><Text style={[x.value,{flex:1}]}>{member.display_name}{isYou(member.id)?' (you)':''}</Text>{values.payer===member.id?<Icon name="check"/>:null}</Pressable>)}</View>:null}
   {errors.payer?<Text accessibilityRole="alert" style={s.error}>{errors.payer.message}</Text>:null}
   <View style={x.participantTitle}><Text style={x.participantLabel}>Split with</Text><Text style={x.participantCount}>{selected.length} selected</Text></View>
   <View style={x.participants}>{active.map((member,index)=><Pressable key={member.id} accessibilityRole="checkbox" accessibilityLabel={`Split with ${member.display_name}`} accessibilityState={{checked:selected.includes(member.id)}} onPress={()=>setSelected(ids=>ids.includes(member.id)?ids.filter(id=>id!==member.id):[...ids,member.id])} style={[x.tile,selected.includes(member.id)&&x.tileSelected]}><MemberAvatar name={member.display_name} index={index}/><Text style={x.tileName}>{member.display_name}</Text>{selected.includes(member.id)?<View style={x.check}><Image source={icons.check} style={x.checkIcon} tintColor="white" contentFit="contain"/></View>:null}</Pressable>)}</View>
   <FormInput appearance="auth" containerStyle={{marginBottom:0}} control={control} name="notes" label="Notes (optional)" placeholder="Add a note…" multiline textAlignVertical="top" style={x.notesInput} maxLength={1000} editable={!busy}/>
   <Button appearance="auth" label="Continue to split" onPress={()=>void move()}/>
  </>:step===2?<>
   <View style={x.segmented}>{(['equal','exact','percentage'] as const).map(value=><Pressable key={value} accessibilityRole="radio" accessibilityState={{checked:method===value}} onPress={()=>changeMethod(value)} style={[x.segment,method===value&&x.segmentActive]}><Text style={[x.segmentLabel,method===value&&x.segmentActiveLabel]}>{value[0].toUpperCase()+value.slice(1)}</Text></Pressable>)}</View>
   <View style={[x.allocation,!!splitError&&x.invalid]}><View style={x.allocationTop}><Text style={[x.allocationLabel,!!splitError&&x.invalidText]}>{method==='percentage'?'Allocated':'Total allocated'}</Text><Text style={[x.allocationValue,!!splitError&&x.invalidText]}>{allocationLabel}</Text></View><Text style={[x.allocationHint,!!splitError&&x.invalidText]}>{remainingLabel}</Text></View>
   <View style={x.splitList}>{selected.map((id,index)=>{const share=shares.find(p=>p.member_id===id);return <View key={id} style={[x.splitRow,index>0&&x.divider]}><MemberAvatar name={name(id)} index={avatarIndex(id)}/><View style={x.memberCopy}><Text style={x.memberName}>{name(id)}</Text>{isYou(id)?<Text style={x.you}>You</Text>:null}</View><View style={x.splitValue}>{method==='equal'?<><Text style={x.value}>{share?money(share.owed_minor):'—'}</Text>{share&&amount>0?<Text style={x.mini}>{share.owed_minor>Math.floor(amount/selected.length)?`Includes ${money(1)} rounding`:`${(share.owed_minor/amount*100).toFixed(2)}%`}</Text>:null}</>:<><View style={x.splitInputRow}>{method==='exact'?<Text style={x.splitUnit}>{currency==='MYR'?'RM':currency}</Text>:null}<TextInput accessibilityLabel={`${name(id)} share ${method==='percentage'?'in percent':`in ${currency}`}`} keyboardType="decimal-pad" value={allocations[id]??''} onChangeText={value=>setAllocations(previous=>({...previous,[id]:value}))} style={x.splitInput} underlineColorAndroid="transparent" selectTextOnFocus/>{method==='percentage'?<Text style={x.splitUnit}>%</Text>:null}</View>{method==='percentage'&&share?<Text style={x.mini}>{money(share.owed_minor)}</Text>:null}</>}</View></View>;})}</View>
   <View style={x.rounding}><DashboardIcon name="shield" color={appPalette.muted}/><Text style={x.roundingText}>{method==='equal'?'Roomie assigns rounding remainders to participants in stable membership order.':method==='percentage'?'Percentages must total 100.00%. Rounding remainders go to the largest fractional shares, then membership order.':'Exact shares must add up to the full expense amount.'}</Text></View>
   {splitError?<Text accessibilityRole="alert" style={s.error}>{splitError}</Text>:null}
   <View style={x.actions}><Button appearance="auth" label="Back" variant="secondary" style={[x.secondary,x.backAction]} labelStyle={x.secondaryLabel} onPress={()=>setStep(1)}/><Button appearance="auth" label="Review expense" style={x.mainAction} disabled={!!splitError} onPress={()=>setStep(3)}/></View>
  </>:<>
   <View style={x.reviewTotal}><Text style={s.small}>Total</Text><Text style={x.total}>{money(parseMinor(values.amount))}</Text><Text style={x.ready}>Ready to post</Text></View>
   <View style={x.reviewCard}><Row label="Title" value={values.title}/><Row label="Paid by" value={`${name(values.payer)}${isYou(values.payer)?' (you)':''}`}/><Row label="Date" value={dateLabel}/><Row label="Category" value={values.category}/><Row label="Split" value={`${methodLabel} · ${selected.length} people`}/>{values.notes?<Row label="Notes" value={values.notes}/>:null}</View>
   <View style={x.section}><Text style={s.heading}>Shares</Text><Pressable accessibilityRole="button" accessibilityLabel="Edit expense split" disabled={busy} onPress={()=>setStep(2)} style={x.edit}><Text style={x.editText}>Edit</Text></Pressable></View>
   <View style={x.reviewCard}>{shares.map((share,index)=><View key={share.member_id} style={[x.shareRow,index>0&&x.divider]}><MemberAvatar name={name(share.member_id)} index={avatarIndex(share.member_id)} small/><Text style={[x.value,{flex:1}]}>{name(share.member_id)}</Text><Text style={x.value}>{money(share.owed_minor)}</Text></View>)}</View>
   <View style={x.effect}><DashboardIcon name="shield" color={appPalette.muted}/><Text style={x.effectText}>Posting updates household balances and records the expense history.</Text></View>
   <View style={x.actions}><Button appearance="auth" label="Edit" variant="secondary" style={[x.secondary,x.backAction]} labelStyle={x.secondaryLabel} disabled={busy} onPress={()=>setStep(1)}/><Button appearance="auth" style={x.mainAction} label={original?'Save changes':'Save expense'} loading={busy} onPress={()=>void save()}/></View>
  </>}
  {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
 </ExpenseFormSheet>;
}
