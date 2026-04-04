'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavigationItem = {
  href: string;
  label: string;
  variant?: 'primary' | 'secondary';
};

const NAV_ITEMS: NavigationItem[] = [
  { href: '/dashboard', label: 'แดชบอร์ด' },
  { href: '/surveyor', label: 'คิวนักสำรวจ' },
  { href: '/billing', label: 'คิวการเงิน' },
  { href: '/manager', label: 'คิวผู้จัดการ' },
  { href: '/document', label: 'คิวเอกสาร' },
  { href: '/krabi', label: 'คิวกระบี่' },
  { href: '/requests/new', label: 'สร้างคำร้องใหม่', variant: 'primary' }
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/requests/new') {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNavigation() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-2 text-sm">
      {NAV_ITEMS.map((item) => {
        const isActive = isActivePath(pathname, item.href);
        const isPrimary = item.variant === 'primary';

        const className = isPrimary
          ? 'btn-primary'
          : isActive
            ? 'inline-flex items-center justify-center rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white transition'
            : 'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-[#64748B] transition hover:bg-slate-100 hover:text-[#0F172A]';

        return (
          <Link key={item.href} className={className} href={item.href}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
