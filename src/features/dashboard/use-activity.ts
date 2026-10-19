import { useCallback } from 'react';
import { useSharedRefresh } from '@/hooks/use-shared-refresh';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { requireSupabase } from '@/lib/supabase';
export function useActivity(household:string,expanded:boolean) {
 const {session}=useAuth();
 const query=useQuery({queryKey:['activity',session?.user.id,household,expanded],enabled:!!session&&!!household,
 queryFn:async({signal})=>{
  const {data,error}=await requireSupabase().from('activity_events').select('*').eq('household_id',household).eq('entity_type','expense').order('created_at',{ascending:false}).order('id').limit(expanded?50:3).abortSignal(signal);
  if(error)throw error;return data;
 }});
 const {refetch}=query;
 const refresh=useCallback(()=>refetch({cancelRefetch:false}),[refetch]);
 useSharedRefresh(refresh,!!session&&!!household);
 return query;
}
