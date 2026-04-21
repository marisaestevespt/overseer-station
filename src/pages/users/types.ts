import type { AppRole } from "@/hooks/useUserRole";

export interface ManagedUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
  roles: AppRole[];
}

export interface PendingInvite {
  email: string;
  role: AppRole;
  created_at: string;
}
