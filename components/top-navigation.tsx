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
            ? 'inline-flex min-h-10 min-w-0 items-center justify-center whitespace-nowrap rounded-lg border border-[#1E40AF] bg-[#1E40AF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:border-[#1D4ED8] hover:bg-[#1D4ED8]'
            : 'inline-flex min-h-10 min-w-0 items-center justify-center whitespace-nowrap rounded-lg border border-[#D1D5DB] bg-[#F3F4F6] px-4 py-2 text-sm font-semibold text-[#374151] transition-colors hover:border-[#9CA3AF] hover:bg-[#E5E7EB]';

        return (
          <Link key={item.href} className={className} href={item.href} title={item.label}>
            <span className="block max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
