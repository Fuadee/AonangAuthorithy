import Link from 'next/link';
import { DocumentSummaryKey } from '@/lib/requests/document-summary';

type DocumentSummaryCardItem = {
  key: DocumentSummaryKey;
  label: string;
  count: number;
  href: string;
  isActive: boolean;
  statusHint: string;
  emphasis?: 'default' | 'warning';
};

type DocumentSummaryCardsProps = {
  items: DocumentSummaryCardItem[];
};

export function DocumentSummaryCards({ items }: DocumentSummaryCardsProps) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const toneClass =
          item.emphasis === 'warning'
            ? item.isActive
              ? 'border-rose-300 bg-rose-50/90'
              : 'border-rose-200 bg-rose-50/60'
            : item.isActive
              ? 'border-[#BFDBFE] bg-brand-50/70'
              : 'border-slate-200 bg-white';

        return (
          <Link
            key={item.key}
            className={`rounded-xl border px-4 py-3 shadow-sm transition hover:shadow ${toneClass}`}
            href={item.href}
            title={item.statusHint}
          >
            <p className="truncate text-xs font-medium text-slate-500">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{item.count}</p>
          </Link>
        );
      })}
    </section>
  );
}
