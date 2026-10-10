export type Profile = { id: string; display_name: string; avatar_url: string | null; created_at: string; updated_at: string };
export type Household = { id: string; name: string; currency: 'MYR'; created_by: string; created_at: string };
export type Membership = { id: string; household_id: string; user_id: string; role: 'owner' | 'member'; status: 'active' | 'left'; joined_at: string; left_at: string | null };
export type HouseholdInvite = { id: string; household_id: string; code: string; created_by: string; created_at: string; expires_at: string; max_uses: number; use_count: number; revoked_at: string | null };
type ReadOnlyTable<T> = { Row: T; Insert: never; Update: never; Relationships: [] };
export type Database = {
 public: {
  Tables: {
   profiles: { Row: Profile; Insert: { id: string; display_name: string; avatar_url?: string | null; created_at?: string; updated_at?: string }; Update: { display_name?: string; avatar_url?: string | null }; Relationships: [] };
   households: ReadOnlyTable<Household>;
   household_members: ReadOnlyTable<Membership>;
   household_invites: ReadOnlyTable<HouseholdInvite>;
  };
  Views: { [_ in never]: never };
  Functions: {
   roomie_create_household: { Args: { p_name: string }; Returns: string };
   roomie_join_household: { Args: { p_code: string }; Returns: string };
   roomie_create_invite: { Args: { p_household: string; p_max_uses?: number; p_days?: number }; Returns: HouseholdInvite };
   roomie_revoke_invite: { Args: { p_invite: string }; Returns: undefined };
   roomie_rename_household: { Args: { p_household: string; p_name: string }; Returns: undefined };
  };
  Enums: { [_ in never]: never }; CompositeTypes: { [_ in never]: never };
 }
};
