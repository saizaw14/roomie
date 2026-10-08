export type Profile = {
  id: string; display_name: string; avatar_url: string | null; created_at: string; updated_at: string;
};
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: { id: string; display_name: string; avatar_url?: string | null; created_at?: string; updated_at?: string };
        Update: { display_name?: string; avatar_url?: string | null };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
