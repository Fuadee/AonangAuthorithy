"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.replace("/login");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
    >
      ออกจากระบบ
    </button>
  );
}
