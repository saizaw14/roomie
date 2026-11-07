import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { requireSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useSharedRefresh } from '@/hooks/use-shared-refresh';
import { safeMinor } from '@/features/expenses/domain';
const billSchema=z.array(z.object({id:z.string().uuid(),household_id:z.string().uuid(),title:z.string(),category:z.string(),amount_minor:z.string().nullable().transform(value=>value===null?null:safeMinor(value)),frequency:z.enum(['weekly','monthly']),next_due_date:z.string(),payer_id:z.string().uuid(),active:z.boolean(),version:z.number().int(),participants:z.array(z.string().uuid()),split_method:z.enum(['equal','exact','percentage','single']).default('equal'),allocations:z.array(z.object({member_id:z.string().uuid(),value:z.number().int().nonnegative().optional()})).default([])}));
export type Bill=z.infer<typeof billSchema>[number];
export function useBills(house:string){
 const {session}=useAuth();const enabled=!!session&&!!house;
 const query=useQuery({queryKey:['bills',session?.user.id,house],enabled,queryFn:async()=>{const {data,error}=await requireSupabase().rpc('roomie_bill_dashboard',{p_household:house});if(error)throw error;return billSchema.parse(data);}});
 const {refetch}=query;const refresh=useCallback(()=>refetch({cancelRefetch:false}),[refetch]);useSharedRefresh(refresh,enabled);return query;
}
export function billError(error:unknown){
 const code=typeof error==='object'&&error!==null&&'code' in error?String(error.code):'';
 if(['PGRST202','42883'].includes(code))return 'Bill split setup is missing. Apply docs/supabase-dashboard-bill-splits.sql in Supabase, then retry.';
 if(['42P01','PGRST205'].includes(code))return 'Bill setup is missing. Apply docs/supabase-dashboard-bills.sql in Supabase, then retry.';
 if(code==='42501')return 'You need active household membership. Only the owner can manage recurring bills.';
 if(code==='40001')return 'This bill changed. Close it and refresh before trying again.';
 if(code==='22023')return 'Check the amount, date, active members and split totals. An occurrence can only be posted once.';
 return error instanceof Error?error.message:'Could not save the bill. Check your connection and try again.';
}
export function dueLabel(date:string,today:string){
 const days=Math.round((Date.parse(date+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000);
 return days<0?`Overdue ${-days} day${days===-1?'':'s'}`:days===0?'Due today':`Due ${new Date(date+'T12:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short'})}`;
}
