import { useCallback } from 'react';
import { useSharedRefresh } from '@/hooks/use-shared-refresh';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { listMembers } from '@/features/households/api';
import { isExpenseId } from './domain';
import { getExpense,listExpenses } from './api';
export function useExpenses(house:string) {
 const {session}=useAuth();const enabled=!!session&&!!house;
 const query=useQuery({queryKey:['expenses',session?.user.id,house],queryFn:()=>listExpenses(house),enabled});
 const {refetch}=query;
 const refresh=useCallback(()=>refetch({cancelRefetch:false}),[refetch]);
 useSharedRefresh(refresh,enabled);
 return query;
}
export function useExpense(id:string) {const {session}=useAuth();return useQuery({queryKey:['expense',session?.user.id,id],queryFn:()=>getExpense(id),enabled:!!session&&isExpenseId(id),refetchOnWindowFocus:false});}
export function useExpenseMembers(house:string) {const {session}=useAuth();return useQuery({queryKey:['expense-members',session?.user.id,house],queryFn:()=>listMembers(house),enabled:!!session&&!!house});}
