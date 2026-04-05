'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { REQUEST_QUEUE_GROUP_META } from '@/lib/requests/types';

type NavigationItem = {
  href: string;
  label: string;
  variant?: 'primary' | 'secondary';
};

const NAV_ITEMS: NavigationItem[] = [
  { href: '/dashboard', label: 'แดชบอร์ด' },
  { href: '/analytics', label: 'วิเคราะห์' },
  { href: '/surveyor', label: REQUEST_QUEUE_GROUP_META.SURVEY.label },
  { href: '/billing', label: REQUEST_QUEUE_GROUP_META.BILLING.label },
  { href: '/manager', label: REQUEST_QUEUE_GROUP_META.MANAGER.label },
  { href: '/document', label: REQUEST_QUEUE_GROUP_META.DISPATCH.label },
  { href: '/krabi', label: REQUEST_QUEUE_GROUP_META.KRABI.label },
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
            ? 'inline-flex min-w-0 items-center justify-center whitespace-nowrap rounded-full bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition'
            : 'inline-flex min-w-0 items-center justify-center whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-[#64748B] transition hover:bg-slate-50 hover:text-[#0F172A]';

        return (
          <Link key={item.href} className={className} href={item.href} title={item.label}>
            <span className="block max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
