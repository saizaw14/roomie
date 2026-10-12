import { requireSupabase } from '@/lib/supabase';
import { safeMinor, parseMinor, type Allocation, type SplitMethod } from './domain';
import { expenseSchema, type ExpenseValues } from './validation';
import type { Expense, ExpensePayer, ExpenseSplit } from '@/types/database';
async function readPages<T>(fetch: (from:number,to:number)=>PromiseLike<{data:T[]|null;error:unknown}>) {
 const rows:T[]=[];
 for(let from=0;;from+=500) { const result=await fetch(from,from+499); if(result.error) throw result.error; const page=result.data??[]; rows.push(...page); if(page.length<500) return rows; }
}
const normalize = (row: Expense) => ({ ...row, amount_minor: safeMinor(row.amount_minor) });
export async function listExpenses(household: string) {
 const db = requireSupabase();
 const readExpenses=()=>readPages<Expense>((from,to)=>db.from('expenses').select('*').eq('household_id',household).order('id').range(from,to));
 for(let attempt=0;attempt<3;attempt++) {
  const expenses=await readExpenses();
  const [payers,splits]=await Promise.all([
   readPages<ExpensePayer>((from,to)=>db.from('expense_payers').select('*').eq('household_id',household).order('expense_id').order('member_id').range(from,to)),
   readPages<ExpenseSplit>((from,to)=>db.from('expense_splits').select('*').eq('household_id',household).order('expense_id').order('member_id').range(from,to)),
  ]);
  const check=await readExpenses();
  if(check.length!==expenses.length||check.some((e,i)=>e.id!==expenses[i].id||e.version!==expenses[i].version)) continue;
  return { expenses:expenses.map(normalize),payers:payers.map(p=>({...p,paid_minor:safeMinor(p.paid_minor)})),splits:splits.map(p=>({...p,owed_minor:safeMinor(p.owed_minor)})) };
 }
 throw new Error('Expenses changed while loading. Refresh the list in a moment.');
}
export async function getExpense(id: string) {
 const db=requireSupabase();
 for(let attempt=0;attempt<3;attempt++) {
  // Bracket child reads with versions, so a committed edit cannot mix revisions.
  const expense=await db.from('expenses').select('*').eq('id',id).single();
  if(expense.error) throw expense.error;
  const [payers,splits,revisions]=await Promise.all([
   db.from('expense_payers').select('*').eq('expense_id',id),
   db.from('expense_splits').select('*').eq('expense_id',id),
   readPages<import('@/types/database').ExpenseRevision>((from,to)=>db.from('expense_revisions').select('*').eq('expense_id',id).order('version',{ascending:false}).range(from,to)),
  ]);
  if(payers.error) throw payers.error; if(splits.error) throw splits.error;
  const check=await db.from('expenses').select('version').eq('id',id).single();
  if(check.error) throw check.error;
  if(check.data.version!==expense.data.version) continue;
  return { expense:normalize(expense.data), payers:payers.data.map(p=>({...p,paid_minor:safeMinor(p.paid_minor)})), splits:splits.data.map(p=>({...p,owed_minor:safeMinor(p.owed_minor)})), revisions };
 }
 throw new Error('Expense is being changed. Refresh its details in a moment.');
}
export async function saveExpense(household:string, values:ExpenseValues, method:SplitMethod, participants:Allocation[], request:string, original?:Expense) {
 const v=expenseSchema.parse(values);
 const amount=parseMinor(v.amount);
 const args={p_household:household,p_title:v.title,p_category:v.category,p_amount:amount,p_date:v.date,p_notes:v.notes,p_method:method,p_payers:[{member_id:v.payer,value:amount}],p_participants:participants.map(p=>method==='equal'?{member_id:p.member_id}:{member_id:p.member_id,value:p.value!})};
 const result=original?await requireSupabase().rpc('roomie_update_expense',{...args,p_id:original.id,p_version:original.version}):await requireSupabase().rpc('roomie_create_expense',{...args,p_request:request});
 if(result.error) throw result.error; return result.data;
}
export async function voidExpense(expense:Expense,reason:string) {
 const {error}=await requireSupabase().rpc('roomie_void_expense',{p_id:expense.id,p_version:expense.version,p_reason:reason}); if(error) throw error;
}
