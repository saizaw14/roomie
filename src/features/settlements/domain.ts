export type Balance={member_id:string;user_id:string;status:string;net:number};
export function settlementSuggestions(balances:Balance[]) {
 const seen=new Set<string>();let total=0n;
 const values=balances.map(b=>{if(seen.has(b.member_id)||!Number.isSafeInteger(b.net))throw new Error('Invalid household balances.');seen.add(b.member_id);total+=BigInt(b.net);return {...b,value:BigInt(b.net)};}).sort((a,b)=>a.member_id.localeCompare(b.member_id));
 if(total!==0n)throw new Error('Household balances do not total zero.');
 const debtors=values.filter(b=>b.value<0n);const creditors=values.filter(b=>b.value>0n);
 const result:{sender:string;recipient:string;amount:number}[]=[];let i=0,j=0;
 while(i<debtors.length&&j<creditors.length){const from=debtors[i],to=creditors[j];const amount=-from.value<to.value?-from.value:to.value;result.push({sender:from.member_id,recipient:to.member_id,amount:Number(amount)});from.value+=amount;to.value-=amount;if(from.value===0n)i++;if(to.value===0n)j++;}
 return result;
}
