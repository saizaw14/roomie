import { MAX_MINOR } from '../expenses/domain.ts';
type ExpenseRow={id:string;status:string;amount_minor:number};
type PayerRow={expense_id:string;member_id:string;paid_minor:number};
type SplitRow={expense_id:string;member_id:string;owed_minor:number};
function integer(value:number) {
 if(!Number.isSafeInteger(value)||value<0||value>MAX_MINOR)throw new Error('Invalid financial amount.');
 return BigInt(value);
}
function safe(value:bigint) {
 if(value>BigInt(Number.MAX_SAFE_INTEGER)||value<BigInt(Number.MIN_SAFE_INTEGER))throw new Error('Balance exceeds supported display range.');
 return Number(value);
}
/** Expense-only read model. Confirmed repayments will be added with the settlement milestone. */
export function expenseSummary(data:{expenses:ExpenseRow[];payers:PayerRow[];splits:SplitRow[]},memberId:string) {
 const posted=new Set(data.expenses.filter(e=>e.status==='posted').map(e=>e.id));
 let paid=0n;let owed=0n;let spending=0n;
 for(const e of data.expenses)if(posted.has(e.id))spending+=integer(e.amount_minor);
 for(const p of data.payers)if(posted.has(p.expense_id)&&p.member_id===memberId)paid+=integer(p.paid_minor);
 for(const s of data.splits)if(posted.has(s.expense_id)&&s.member_id===memberId)owed+=integer(s.owed_minor);
 return {net:safe(paid-owed),paid:safe(paid),owed:safe(owed),spending:safe(spending),count:posted.size};
}
