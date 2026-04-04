import Link from 'next/link';
import {
  getCurrentSurveyDate,
  getCustomerDelaySummary,
  getKrabiDispatchWarning,
  getRequestQueueGroup,
  getRequestQueueGroupLabel,
  getRequestStatusLabel,
  hasSurveyBeenRescheduled,
  hasCollectedDocsOnSite,
  hasPinnedLocation,
  needsRescheduleAfterDocuments,
  getFinalApprovalSource,
  REQUEST_TYPE_LABELS,
  ServiceRequest
} from '@/lib/requests/types';

type RequestTableProps = {
  requests: ServiceRequest[];
};

function formatSurveyDate(value: string | null): string {
  if (!value) {
    return '-';
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString('th-TH', { dateStyle: 'medium' });
}

export function RequestTable({ requests }: RequestTableProps) {
  const headClass = 'px-3 py-2.5 align-middle font-medium whitespace-nowrap';
  const compactCellClass = 'px-3 py-2.5 align-middle';
  const singleLineCellClass = `${compactCellClass} max-w-0`;

  return (
    <div className="card mt-6 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[1280px] w-full table-fixed divide-y divide-slate-200 text-sm">
          <colgroup>
            <col className="w-[10%] min-w-[120px]" />
            <col className="w-[14%] min-w-[170px]" />
            <col className="w-[11%] min-w-[130px]" />
            <col className="w-[10%] min-w-[130px]" />
            <col className="w-[8%] min-w-[110px]" />
            <col className="w-[9%] min-w-[120px]" />
            <col className="w-[9%] min-w-[120px]" />
            <col className="w-[10%] min-w-[140px]" />
            <col className="w-[8%] min-w-[110px]" />
            <col className="w-[21%] min-w-[270px]" />
          </colgroup>
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr>
              <th className={headClass}>Request No.</th>
              <th className={headClass}>ลูกค้า</th>
              <th className={headClass}>โทรศัพท์</th>
              <th className={headClass}>ประเภทคำร้อง</th>
              <th className={headClass}>พื้นที่</th>
              <th className={headClass}>ผู้รับผิดชอบ</th>
              <th className={headClass}>ผู้สำรวจ</th>
              <th className={headClass}>วันนัดสำรวจล่าสุด</th>
              <th className={headClass}>คิวปัจจุบัน</th>
              <th className={headClass}>สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
            {requests.map((request) => (
              <tr key={request.id} className="hover:bg-slate-50">
                <td className={`${singleLineCellClass} font-medium text-brand-600`}>
                  <Link href={`/requests/${request.id}`} className="block truncate whitespace-nowrap hover:underline" title={request.request_no}>
                    {request.request_no}
                  </Link>
                </td>
                <td className={singleLineCellClass} title={request.customer_name}>
                  <p className="truncate whitespace-nowrap">{request.customer_name}</p>
                </td>
                <td className={singleLineCellClass} title={request.phone}>
                  <p className="truncate whitespace-nowrap">{request.phone}</p>
                </td>
                <td className={singleLineCellClass} title={REQUEST_TYPE_LABELS[request.request_type]}>
                  <p className="truncate whitespace-nowrap">{REQUEST_TYPE_LABELS[request.request_type]}</p>
                </td>
                <td className={singleLineCellClass} title={request.area_name}>
                  <p className="truncate whitespace-nowrap">{request.area_name}</p>
                </td>
                <td className={singleLineCellClass} title={request.assignee_name}>
                  <p className="truncate whitespace-nowrap">{request.assignee_name}</p>
                </td>
                <td className={singleLineCellClass} title={request.assigned_surveyor ?? '-'}>
                  <p className="truncate whitespace-nowrap">{request.assigned_surveyor ?? '-'}</p>
                </td>
                <td className={singleLineCellClass}>
                  <p className="truncate whitespace-nowrap">{formatSurveyDate(getCurrentSurveyDate(request))}</p>
                </td>
                <td className={singleLineCellClass} title={getRequestQueueGroupLabel(getRequestQueueGroup(request.status))}>
                  <p className="truncate whitespace-nowrap">{getRequestQueueGroupLabel(getRequestQueueGroup(request.status))}</p>
                </td>
                <td className={compactCellClass}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>{getRequestStatusLabel(request.status)}</span>
                    {hasCollectedDocsOnSite(request) ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        รับเอกสารหน้างาน
                      </span>
                    ) : null}
                    {hasSurveyBeenRescheduled(request) ? (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">เลื่อนนัด</span>
                    ) : null}
                    {request.status === 'WAIT_DOCUMENT_FROM_CUSTOMER' ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">รอเอกสารจากผู้ใช้ไฟ</span>
                    ) : null}
                    {needsRescheduleAfterDocuments(request) ? (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">เอกสารครบ รอนัดใหม่</span>
                    ) : null}
                    {request.status === 'WAIT_CUSTOMER_FIX' ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">รอผู้ใช้ไฟแก้ไข</span>
                    ) : null}
                    {request.status === 'WAIT_FIX_REVIEW' ? (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">รอตรวจจากรูป</span>
                    ) : null}
                    {request.status === 'READY_FOR_RESURVEY' ? (
                      <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-medium text-cyan-700">รอนัดตรวจซ้ำ</span>
                    ) : null}
                    {request.fix_approved_via ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">{getFinalApprovalSource(request)}</span>
                    ) : null}
                    {getKrabiDispatchWarning(request) ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{getKrabiDispatchWarning(request)}</span>
                    ) : null}
                    {hasPinnedLocation(request) ? (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">มีพิกัด</span>
                    ) : null}
                  </div>
                  {getCustomerDelaySummary(request) ? <p className="mt-1 text-xs text-slate-500">{getCustomerDelaySummary(request)}</p> : null}
                </td>
              </tr>
            ))}
            {!requests.length && (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={10}>
                  ยังไม่มีคำร้อง
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
