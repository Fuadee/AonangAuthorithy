type DashboardSummaryProps = {
  totalCount: number;
  meterCount: number;
  expansionCount: number;
};

export function DashboardSummary({ totalCount, meterCount, expansionCount }: DashboardSummaryProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <article className="card p-5">
        <p className="text-sm text-slate-500">คำร้องทั้งหมด</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{totalCount}</p>
      </article>
      <article className="card p-5">
        <p className="text-sm text-slate-500">คำร้องขอมิเตอร์</p>
        <p className="mt-2 text-3xl font-semibold text-brand-600">{meterCount}</p>
      </article>
      <article className="card p-5">
        <p className="text-sm text-slate-500">คำร้องขยายเขต</p>
        <p className="mt-2 text-3xl font-semibold text-brand-600">{expansionCount}</p>
      </article>
    </section>
  );
}
