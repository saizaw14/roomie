import { requireSupabase } from '@/lib/supabase';
import { householdSchema, invitationCode, inviteSchema } from './validation';
export async function listHouseholds() {
 const client = requireSupabase();
 const [houses, members] = await Promise.all([
  client.from('households').select('*').order('created_at'),
  client.from('household_members').select('*').eq('status', 'active'),
 ]);
 if (houses.error) throw houses.error;
 if (members.error) throw members.error;
 return { households: houses.data, memberships: members.data };
}
export async function listMembers(id: string) {
 const client = requireSupabase();
 const { data, error } = await client.from('household_members').select('*').eq('household_id', id).order('joined_at');
 if (error) throw error;
 if (!data.length) return [];
 const profiles = await client.from('profiles').select('id, display_name').in('id', data.map(m => m.user_id));
 if (profiles.error) throw profiles.error;
 return data.map(m => ({ ...m, display_name: profiles.data.find(p => p.id === m.user_id)?.display_name ?? 'Former member' }));
}
export async function listInvites(id: string) {
 const { data, error } = await requireSupabase().from('household_invites').select('*').eq('household_id', id).order('created_at', { ascending: false });
 if (error) throw error;
 return data;
}
export async function createHousehold(name: string, currency: string) {
 const values = householdSchema.parse({ name });
 const { data, error } = await requireSupabase().rpc('roomie_create_household', { p_name: values.name, p_currency: currency });
 if (error) throw error;
 return data;
}
export async function joinHousehold(code: string) {
 const { data, error } = await requireSupabase().rpc('roomie_join_household', { p_code: invitationCode(code) });
 if (error) throw error;
 return data;
}
export async function createInvite(id: string, maxUses: string, days: string) {
 const values = inviteSchema.parse({ maxUses, days });
 const { data, error } = await requireSupabase().rpc('roomie_create_invite', { p_household: id, p_max_uses: values.maxUses, p_days: values.days });
 if (error) throw error;
 return data;
}
export async function revokeInvite(id: string) {
 const { error } = await requireSupabase().rpc('roomie_revoke_invite', { p_invite: id });
 if (error) throw error;
}
export async function renameHousehold(id: string, name: string) {
 const values = householdSchema.parse({ name });
 const { error } = await requireSupabase().rpc('roomie_rename_household', { p_household: id, p_name: values.name });
 if (error) throw error;
}
