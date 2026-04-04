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
  const headClass = 'px-3 py-2 align-middle font-semibold whitespace-nowrap text-[13px] tracking-wide text-slate-700';
  const compactCellClass = 'px-3 py-2 align-middle';
  const singleLineCellClass = `${compactCellClass} max-w-0`;

  return (
    <div className="card mt-6 overflow-hidden">
      <div className="overflow-x-hidden">
        <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
          <colgroup>
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className={headClass}>Request No.</th>
              <th className={headClass}>ลูกค้า</th>
              <th className={headClass}>ประเภทคำร้อง</th>
              <th className={headClass}>ผู้รับผิดชอบ</th>
              <th className={headClass}>ผู้สำรวจ</th>
              <th className={headClass}>วันนัดสำรวจล่าสุด</th>
              <th className={headClass}>คิวปัจจุบัน</th>
              <th className={headClass}>สถานะ</th>
            </tr>
          </thead>
          <tbody className="bg-white text-slate-700">
            {requests.map((request) => (
              <tr key={request.id} className="hover:bg-slate-50">
                <td className={`${singleLineCellClass} border-b border-slate-200 font-semibold text-brand-700`} title={request.request_no}>
                  <Link
                    href={`/requests/${request.id}`}
                    className="truncate whitespace-nowrap hover:underline"
                    aria-label={`เปิดรายละเอียดคำร้อง ${request.request_no}`}
                  >
                    {request.request_no}
                  </Link>
                </td>
                <td className={`${singleLineCellClass} border-b border-slate-200`} title={request.customer_name}>
                  <p className="truncate whitespace-nowrap">{request.customer_name}</p>
                </td>
                <td className={`${singleLineCellClass} border-b border-slate-200 text-[13px]`} title={REQUEST_TYPE_LABELS[request.request_type]}>
                  <p className="truncate whitespace-nowrap">{REQUEST_TYPE_LABELS[request.request_type]}</p>
                </td>
                <td className={`${singleLineCellClass} border-b border-slate-200 text-[13px]`} title={request.assignee_name}>
                  <p className="truncate whitespace-nowrap">{request.assignee_name}</p>
                </td>
                <td className={`${singleLineCellClass} border-b border-slate-200 text-[13px]`} title={request.assigned_surveyor ?? '-'}>
                  <p className="truncate whitespace-nowrap">{request.assigned_surveyor ?? '-'}</p>
                </td>
                <td className={`${singleLineCellClass} border-b border-slate-200 text-[13px]`}>
                  <p className="truncate whitespace-nowrap">{formatSurveyDate(getCurrentSurveyDate(request))}</p>
                </td>
                <td className={`${singleLineCellClass} border-b border-slate-200 text-[13px]`} title={getRequestQueueGroupLabel(getRequestQueueGroup(request.status))}>
                  <p className="truncate whitespace-nowrap">{getRequestQueueGroupLabel(getRequestQueueGroup(request.status))}</p>
                </td>
                <td className={`${compactCellClass} border-b border-slate-200`}>
                  <p className="truncate whitespace-nowrap text-[13px] font-medium text-slate-800">{getRequestStatusLabel(request.status)}</p>
                  <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                    {hasCollectedDocsOnSite(request) ? <p>• รับเอกสารหน้างาน</p> : null}
                    {hasSurveyBeenRescheduled(request) ? <p>• เลื่อนนัด</p> : null}
                    {request.status === 'WAIT_DOCUMENT_FROM_CUSTOMER' ? <p>• รอเอกสารจากผู้ใช้ไฟ</p> : null}
                    {needsRescheduleAfterDocuments(request) ? <p>• เอกสารครบ รอนัดใหม่</p> : null}
                    {request.status === 'WAIT_CUSTOMER_FIX' ? <p>• รอผู้ใช้ไฟแก้ไข</p> : null}
                    {request.status === 'WAIT_FIX_REVIEW' ? <p>• รอตรวจจากรูป</p> : null}
                    {request.status === 'READY_FOR_RESURVEY' ? <p>• รอนัดตรวจซ้ำ</p> : null}
                    {request.fix_approved_via ? <p>• {getFinalApprovalSource(request)}</p> : null}
                    {getKrabiDispatchWarning(request) ? <p>• {getKrabiDispatchWarning(request)}</p> : null}
                    {hasPinnedLocation(request) ? <p>• มีพิกัด</p> : null}
                  </div>
                  {getCustomerDelaySummary(request) ? <p className="mt-1 text-xs text-slate-500">{getCustomerDelaySummary(request)}</p> : null}
                </td>
              </tr>
            ))}
            {!requests.length && (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={8}>
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
