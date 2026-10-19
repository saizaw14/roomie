import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { focusManager } from '@tanstack/react-query';

/** Refresh remote household changes only while this route and app are active. */
export function useSharedRefresh(refetch:()=>Promise<unknown>, enabled:boolean) {
 useFocusEffect(useCallback(()=>{
  if(!enabled)return;
  // Join in-flight requests rather than cancelling an existing consistent read.
  const refresh=()=>{if(focusManager.isFocused())void refetch();};
  refresh();
  const timer=setInterval(refresh,10000);
  const unsubscribe=focusManager.subscribe(focused=>{if(focused)refresh();});
  return ()=>{clearInterval(timer);unsubscribe();};
 },[enabled,refetch]));
}
