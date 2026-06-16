import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const OPERATOR_ROLES = ["operator", "admin"] satisfies AppRole[];

export const canAccessOps = (role: AppRole | null | undefined) =>
  role === "operator" || role === "admin";
