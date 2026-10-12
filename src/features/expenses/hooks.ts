import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { listMembers } from '@/features/households/api';
import { isExpenseId } from './domain';
import { getExpense,listExpenses } from './api';
export function useExpenses(house:string) {const {session}=useAuth();return useQuery({queryKey:['expenses',session?.user.id,house],queryFn:()=>listExpenses(house),enabled:!!session&&!!house});}
export function useExpense(id:string) {const {session}=useAuth();return useQuery({queryKey:['expense',session?.user.id,id],queryFn:()=>getExpense(id),enabled:!!session&&isExpenseId(id),refetchOnWindowFocus:false});}
export function useExpenseMembers(house:string) {const {session}=useAuth();return useQuery({queryKey:['expense-members',session?.user.id,house],queryFn:()=>listMembers(house),enabled:!!session&&!!house});}
