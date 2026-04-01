import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_PERMISSIONS } from "@/lib/workflow/constants";
import type { RoleCode } from "@/types/domain";

type UserRoleRow = {
  roles: Array<{
    code: RoleCode | string;
  }>;
};

const VALID_ROLES: RoleCode[] = [
  "RECEPTIONIST",
  "SURVEYOR",
  "OPERATIONS",
  "SUPERVISOR",
  "MANAGER",
  "INSTALL_PLANNER"
];

function isRoleCode(value: string): value is RoleCode {
  return VALID_ROLES.includes(value as RoleCode);
}

export async function requireAuth() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  return data.user;
}

export async function getMyRoles(): Promise<RoleCode[]> {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_roles")
    .select("roles(code)")
    .eq("user_id", user.id);

  if (error || !data) {
    return [];
  }

  return (data as unknown as UserRoleRow[])
    .flatMap((row) => row.roles ?? [])
    .map((role) => String(role.code))
    .filter(isRoleCode);
}

export async function requirePermission(permission: string) {
  const user = await requireAuth();
  const roles = await getMyRoles();

  const granted = roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
  if (!granted) {
    redirect("/dashboard?error=forbidden");
  }

  return { user, roles };
}
