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
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {queueItems.map((item) => (
        <Link
          key={item.queue}
          className="card flex min-h-[112px] flex-col justify-between p-5 transition duration-200 hover:scale-[1.01] hover:shadow-sm"
          href={item.href}
        >
          <p className="truncate text-sm text-[#64748B]">{item.label}</p>
          <p className={`text-2xl font-semibold ${item.toneClass}`}>{item.count}</p>
        </Link>
      ))}
    </section>
  );
}
