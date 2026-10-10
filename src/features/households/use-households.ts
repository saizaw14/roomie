import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { listHouseholds } from './api';
export function useHouseholds() {
 const { session } = useAuth();
 const client = useQueryClient();
 const user = session?.user.id ?? '';
 const query = useQuery({ queryKey: ['households', user], queryFn: listHouseholds, enabled: !!user });
 const selected = useQuery<string | null>({ queryKey: ['household-selection', user], queryFn: () => null, initialData: null, enabled: false, gcTime: Infinity });
 const houses = query.data?.households ?? [];
 const current = houses.find(h => h.id === selected.data) ?? houses[0] ?? null;
 const membership = query.data?.memberships.find(m => m.household_id === current?.id && m.user_id === user);
 return { ...query, houses, current, membership, select: (id: string) => client.setQueryData(['household-selection', user], id) };
}
