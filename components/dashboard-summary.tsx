type DashboardSummaryProps = {
  totalCount: number;
  meterCount: number;
  expansionCount: number;
  surveyQueueCount: number;
  billingQueueCount: number;
  managerQueueCount: number;
  pendingSurveyReviewCount: number;
  waitBillingCount: number;
  waitActionConfirmationCount: number;
};

export function DashboardSummary({
  totalCount,
  meterCount,
  expansionCount,
  surveyQueueCount,
  billingQueueCount,
  managerQueueCount,
  pendingSurveyReviewCount,
  waitBillingCount,
  waitActionConfirmationCount
}: DashboardSummaryProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-9">
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
        <p className="text-sm text-slate-500">คิวนักสำรวจ</p>
        <p className="mt-2 text-3xl font-semibold text-sky-700">{surveyQueueCount}</p>
      </article>
      <article className="card p-5">
        <p className="text-sm text-slate-500">คิวการเงิน</p>
        <p className="mt-2 text-3xl font-semibold text-purple-700">{billingQueueCount}</p>
      </article>
      <article className="card p-5">
        <p className="text-sm text-slate-500">คิวผู้จัดการ</p>
        <p className="mt-2 text-3xl font-semibold text-indigo-700">{managerQueueCount}</p>
      </article>
      <article className="card p-5">
        <p className="text-sm text-slate-500">รอตรวจเอกสารนักสำรวจ</p>
        <p className="mt-2 text-3xl font-semibold text-amber-600">{pendingSurveyReviewCount}</p>
      </article>
      <article className="card p-5">
        <p className="text-sm text-slate-500">รอออกใบแจ้งหนี้</p>
        <p className="mt-2 text-3xl font-semibold text-purple-700">{waitBillingCount}</p>
      </article>
      <article className="card p-5">
        <p className="text-sm text-slate-500">รอดำเนินการหลังแจ้งหนี้</p>
        <p className="mt-2 text-3xl font-semibold text-emerald-700">{waitActionConfirmationCount}</p>
      </article>
    </section>
  );
}
