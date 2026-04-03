type DashboardSummaryProps = {
  totalCount: number;
  meterCount: number;
  expansionCount: number;
  surveyQueueCount: number;
  billingQueueCount: number;
  managerQueueCount: number;
  pendingSurveyReviewCount: number;
  waitDocumentReviewCount: number;
  waitDocumentFromCustomerCount: number;
  readyToScheduleSurveyCount: number;
  rescheduledSurveyCount: number;
  inSurveyCount: number;
  waitCustomerFixCount: number;
  waitFixReviewCount: number;
  readyForResurveyCount: number;
  waitBillingCount: number;
  waitActionConfirmationCount: number;
  approvedViaPhotoCount: number;
};

export function DashboardSummary({
  totalCount,
  meterCount,
  expansionCount,
  surveyQueueCount,
  billingQueueCount,
  managerQueueCount,
  pendingSurveyReviewCount,
  waitDocumentReviewCount,
  waitDocumentFromCustomerCount,
  readyToScheduleSurveyCount,
  rescheduledSurveyCount,
  inSurveyCount,
  waitCustomerFixCount,
  waitFixReviewCount,
  readyForResurveyCount,
  waitBillingCount,
  waitActionConfirmationCount,
  approvedViaPhotoCount
}: DashboardSummaryProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-12">
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
        <p className="text-sm text-slate-500">รอตรวจเอกสารหลังสำรวจ</p>
        <p className="mt-2 text-3xl font-semibold text-amber-600">{waitDocumentReviewCount}</p>
      </article>
      <article className="card p-5">
        <p className="text-sm text-slate-500">รอผู้ใช้ไฟนำเอกสารมาให้</p>
        <p className="mt-2 text-3xl font-semibold text-orange-600">{waitDocumentFromCustomerCount}</p>
      </article>
      <article className="card p-5">
        <p className="text-sm text-slate-500">พร้อมนัดสำรวจ</p>
        <p className="mt-2 text-3xl font-semibold text-cyan-700">{readyToScheduleSurveyCount}</p>
      </article>
      <article className="card p-5">
        <p className="text-sm text-slate-500">นัดสำรวจใหม่แล้ว</p>
        <p className="mt-2 text-3xl font-semibold text-orange-700">{rescheduledSurveyCount}</p>
      </article>
      <article className="card p-5">
        <p className="text-sm text-slate-500">กำลังสำรวจ</p>
        <p className="mt-2 text-3xl font-semibold text-sky-700">{inSurveyCount}</p>
      </article>
      <article className="card p-5">
        <p className="text-sm text-slate-500">รอผู้ใช้ไฟแก้ไข</p>
        <p className="mt-2 text-3xl font-semibold text-rose-700">{waitCustomerFixCount}</p>
      </article>
      <article className="card p-5">
        <p className="text-sm text-slate-500">รอตรวจจากรูป</p>
        <p className="mt-2 text-3xl font-semibold text-violet-700">{waitFixReviewCount}</p>
      </article>
      <article className="card p-5">
        <p className="text-sm text-slate-500">รอนัดตรวจซ้ำ</p>
        <p className="mt-2 text-3xl font-semibold text-cyan-700">{readyForResurveyCount}</p>
      </article>
      <article className="card p-5">
        <p className="text-sm text-slate-500">รอออกใบแจ้งหนี้</p>
        <p className="mt-2 text-3xl font-semibold text-purple-700">{waitBillingCount}</p>
      </article>
      <article className="card p-5">
        <p className="text-sm text-slate-500">รอดำเนินการหลังแจ้งหนี้</p>
        <p className="mt-2 text-3xl font-semibold text-emerald-700">{waitActionConfirmationCount}</p>
      </article>
      <article className="card p-5">
        <p className="text-sm text-slate-500">งานผ่านจากรูป</p>
        <p className="mt-2 text-3xl font-semibold text-emerald-700">{approvedViaPhotoCount}</p>
      </article>
    </section>
  );
}
