import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { requireSupabase } from '@/lib/supabase';
export function useActivity(household:string,expanded:boolean) {
 const {session}=useAuth();
 return useQuery({queryKey:['activity',session?.user.id,household,expanded],enabled:!!session&&!!household,
 queryFn:async({signal})=>{
  const {data,error}=await requireSupabase().from('activity_events').select('*').eq('household_id',household).eq('entity_type','expense').order('created_at',{ascending:false}).order('id').limit(expanded?50:3).abortSignal(signal);
  if(error)throw error;return data;
 }});
}
