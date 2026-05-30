export type UserRole = 'trainer' | 'user' | 'free';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenant_id: string | null;
  tenant_name: string | null;
  tenant_logo_svg: string | null;
  tenant_primary_hex: string;
  assigned_planning_id: string | null;
  is_active: boolean;
  created_at: string;
}
