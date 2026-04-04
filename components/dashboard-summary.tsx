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
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {queueItems.map((item) => (
        <Link key={item.queue} className="card p-5 transition hover:-translate-y-0.5 hover:shadow-md" href={item.href}>
          <p className="text-sm text-slate-500">{item.label}</p>
          <p className={`mt-2 text-3xl font-semibold ${item.toneClass}`}>{item.count}</p>
        </Link>
      ))}
    </section>
  );
}
