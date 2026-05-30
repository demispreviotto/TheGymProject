export type UserRole = 'trainer' | 'user' | 'free';
export type Language = 'en' | 'es';

export interface Tenant {
  id: string;
  owner_id: string;
  name: string;
  logo_svg: string | null;
  primary_hex: string;
  created_at: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenant_id: string | null;       // trainer's auth.users.id — used by existing RLS policies
  tenant_ref_id: string | null;   // references tenants.id — used for branding
  assigned_planning_id: string | null;
  assigned_trainer_id: string | null;
  is_active: boolean;
  preferred_language: Language;
  created_at: string;
}
