import type { ReactNode } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { requireAuth } from "@/lib/guards/auth";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireAuth();

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 shadow-sm">
        <Link href="/dashboard" className="rounded border px-3 py-1 text-sm">
          Dashboard
        </Link>
        <Link href="/requests/new" className="rounded border px-3 py-1 text-sm">
          รับคำร้องใหม่
        </Link>
        <div className="ml-auto">
          <LogoutButton />
        </div>
      </nav>
      {children}
    </div>
  );
}
