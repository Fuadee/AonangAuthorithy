import Link from 'next/link';

type QueueSummaryItem = {
  queue: string;
  label: string;
  count: number;
  href: string;
  toneClass: string;
};

type DashboardSummaryProps = {
  queueItems: QueueSummaryItem[];
};

export function DashboardSummary({ queueItems }: DashboardSummaryProps) {
  return (
    <section className="flex gap-3 overflow-x-auto pb-2">
      {queueItems.map((item) => (
        <Link
          key={item.queue}
          className="flex h-[52px] min-w-[140px] items-center justify-between rounded-xl border bg-white px-4 py-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
          href={item.href}
        >
          <p className="truncate pr-3 text-sm text-gray-600">{item.label}</p>
          <p className={`text-lg font-semibold ${item.toneClass}`}>{item.count}</p>
        </Link>
      ))}
    </section>
  );
}
