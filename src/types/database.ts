export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type Expense = { id: string; household_id: string; title: string; category: string; amount_minor: number; currency: 'MYR'; expense_date: string; notes: string; split_method: 'equal' | 'exact' | 'percentage'; status: 'posted' | 'void'; created_by: string; created_at: string; updated_at: string; version: number; request_key: string; request_payload: Json; voided_by: string | null; voided_at: string | null; void_reason: string | null };
export type ExpensePayer = { expense_id: string; household_id: string; member_id: string; paid_minor: number };
export type ExpenseSplit = { expense_id: string; household_id: string; member_id: string; owed_minor: number; percentage_bps: number | null };
export type ExpenseRevision = { expense_id: string; household_id: string; version: number; actor_id: string; action: string; snapshot: Json; created_at: string };
export type ActivityEvent = { id: string; household_id: string; actor_id: string; event_type: string; entity_type: string; entity_id: string; metadata: Json; created_at: string };
type ExpenseArgs = { p_household: string; p_title: string; p_category: string; p_amount: number; p_date: string; p_notes: string; p_method: string; p_payers: Json; p_participants: Json };
export type Profile = { id: string; display_name: string; avatar_url: string | null; created_at: string; updated_at: string };
export type Household = { id: string; name: string; currency: 'MYR'; created_by: string; created_at: string };
export type Membership = { id: string; household_id: string; user_id: string; role: 'owner' | 'member'; status: 'active' | 'left'; joined_at: string; left_at: string | null };
export type HouseholdInvite = { id: string; household_id: string; code: string; created_by: string; created_at: string; expires_at: string; max_uses: number; use_count: number; revoked_at: string | null };
type ReadOnlyTable<T> = { Row: T; Insert: never; Update: never; Relationships: [] };
export type Database = {
 public: {
  Tables: {
   profiles: { Row: Profile; Insert: { id: string; display_name: string; avatar_url?: string | null; created_at?: string; updated_at?: string }; Update: { display_name?: string; avatar_url?: string | null }; Relationships: [] };
   expenses: ReadOnlyTable<Expense>;
   expense_payers: ReadOnlyTable<ExpensePayer>;
   expense_splits: ReadOnlyTable<ExpenseSplit>;
   expense_revisions: ReadOnlyTable<ExpenseRevision>;
   activity_events: ReadOnlyTable<ActivityEvent>;
   households: ReadOnlyTable<Household>;
   household_members: ReadOnlyTable<Membership>;
   household_invites: ReadOnlyTable<HouseholdInvite>;
  };
  Views: { [_ in never]: never };
  Functions: {
   roomie_create_expense: { Args: ExpenseArgs & { p_request: string }; Returns: string };
   roomie_update_expense: { Args: ExpenseArgs & { p_id: string; p_version: number }; Returns: string };
   roomie_void_expense: { Args: { p_id: string; p_version: number; p_reason: string }; Returns: undefined };
   roomie_create_household: { Args: { p_name: string }; Returns: string };
   roomie_join_household: { Args: { p_code: string }; Returns: string };
   roomie_create_invite: { Args: { p_household: string; p_max_uses?: number; p_days?: number }; Returns: HouseholdInvite };
   roomie_revoke_invite: { Args: { p_invite: string }; Returns: undefined };
   roomie_rename_household: { Args: { p_household: string; p_name: string }; Returns: undefined };
  };
  Enums: { [_ in never]: never }; CompositeTypes: { [_ in never]: never };
 }
};
