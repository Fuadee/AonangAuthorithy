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

export class PermissionDeniedError extends Error {
  constructor(public readonly permission: string, public readonly userId: string, message?: string) {
    super(message ?? `Permission denied for ${permission}`);
    this.name = "PermissionDeniedError";
  }
}

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
    console.error("[auth] getMyRoles failed", { userId: user.id, error: error?.message });
    return [];
  }

  return (data as unknown as UserRoleRow[])
    .flatMap((row) => row.roles ?? [])
    .map((role) => String(role.code))
    .filter(isRoleCode);
}

export type RequirePermissionOptions = {
  redirectTo?: string | null;
};

export async function requirePermission(permission: string, options: RequirePermissionOptions = {}) {
  const user = await requireAuth();
  const roles = await getMyRoles();
  const permissions = roles.flatMap((role) => ROLE_PERMISSIONS[role] ?? []);

  console.info("[auth] permission check", {
    userId: user.id,
    permission,
    roles,
    permissions
  });

  const granted = permissions.includes(permission);
  if (!granted) {
    console.warn("[auth] permission denied", {
      userId: user.id,
      permission,
      roles,
      permissions
    });

    if (options.redirectTo !== null) {
      redirect(options.redirectTo ?? "/forbidden");
    }

    throw new PermissionDeniedError(permission, user.id);
  }

  return { user, roles, permissions };
}
