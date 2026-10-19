import { useCallback } from 'react';
import { focusManager,useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useFocusEffect } from 'expo-router';
import { settlementDashboard } from './api';
export function useSettlements(house:string){const {session}=useAuth();const enabled=!!session&&!!house;const query=useQuery({queryKey:['settlements',session?.user.id,house],queryFn:()=>settlementDashboard(house),enabled});const {refetch}=query;const refresh=useCallback(()=>refetch({cancelRefetch:false}),[refetch]);useFocusEffect(useCallback(()=>{if(!enabled)return;const update=()=>{if(focusManager.isFocused())void refresh();};update();const timer=setInterval(update,10000);const unsubscribe=focusManager.subscribe(focused=>{if(focused)update();});return()=>{clearInterval(timer);unsubscribe();};},[enabled,refresh]));return query;}
