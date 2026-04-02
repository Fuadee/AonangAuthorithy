type DashboardSummaryProps = {
  totalCount: number;
  meterCount: number;
  expansionCount: number;
  pendingSurveyReviewCount: number;
  surveyCompletedCount: number;
};

export function DashboardSummary({
  totalCount,
  meterCount,
  expansionCount,
  pendingSurveyReviewCount,
  surveyCompletedCount
}: DashboardSummaryProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
      <article className="card p-5">
        <p className="text-sm text-slate-500">รอตรวจเอกสารนักสำรวจ</p>
        <p className="mt-2 text-3xl font-semibold text-amber-600">{pendingSurveyReviewCount}</p>
      </article>
      <article className="card p-5">
        <p className="text-sm text-slate-500">สำรวจแล้ว</p>
        <p className="mt-2 text-3xl font-semibold text-emerald-700">{surveyCompletedCount}</p>
      </article>
    </section>
  );
}
