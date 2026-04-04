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
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      {queueItems.map((item) => (
        <Link
          key={item.queue}
          className="flex min-h-[120px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:shadow-md"
          href={item.href}
        >
          <p className="truncate whitespace-nowrap text-sm font-medium text-slate-500">{item.label}</p>
          <p className={`mt-2 text-3xl font-semibold text-slate-900 ${item.toneClass}`}>{item.count}</p>
        </Link>
      ))}
    </section>
  );
}
