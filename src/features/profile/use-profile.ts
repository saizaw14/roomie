import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { requireSupabase } from '@/lib/supabase';
import { profileSchema } from '@/features/auth/schemas';
export function useProfile() {
  const { session } = useAuth();
  const id = session?.user.id;
  return useQuery({ queryKey: ['profile', id], enabled: !!id,
    queryFn: async ({ signal }) => {
      if (!id) throw new Error('Sign in to view your profile.');
      const { data, error } = await requireSupabase().from('profiles').select('*').eq('id', id).abortSignal(signal).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
export function useSaveProfile() {
  const { session } = useAuth();
  const id = session?.user.id;
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async ({ name, exists }: { name: string; exists: boolean }) => {
    if (!id) throw new Error('Sign in to save your profile.');
    const { name: display_name } = profileSchema.parse({ name });
    const client = requireSupabase();
    if (!exists) {
      const { data, error } = await client.from('profiles').insert({ id, display_name }).select('*').single();
      if (!error) return data;
      if (error.code !== '23505') throw error;
      // A concurrent profile creation is safe to follow with an authorized update.
    }
    const { data, error } = await client.from('profiles').update({ display_name }).eq('id', id).select('*').single();
    if (error) throw error;
    return data;
  }, onSuccess: data => {
    // Do not populate a signed-out or different user's cache after an in-flight save.
    if (queryClient.getQueryState(['profile', id])) queryClient.setQueryData(['profile', id], data);
  } });
}
