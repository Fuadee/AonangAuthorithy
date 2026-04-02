type DashboardSummaryProps = {
  totalCount: number;
  newCount: number;
};

export function DashboardSummary({ totalCount, newCount }: DashboardSummaryProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <article className="card p-5">
        <p className="text-sm text-slate-500">คำร้องทั้งหมด</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{totalCount}</p>
      </article>
      <article className="card p-5">
        <p className="text-sm text-slate-500">คำร้องสถานะ NEW</p>
        <p className="mt-2 text-3xl font-semibold text-brand-600">{newCount}</p>
      </article>
    </section>
  );
}
