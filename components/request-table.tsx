import Link from 'next/link';
import {
  getCurrentSurveyDate,
  getCustomerDelaySummary,
  getRequestQueueGroup,
  getRequestQueueGroupLabel,
  getRequestStatusLabel,
  hasSurveyBeenRescheduled,
  hasCollectedDocsOnSite,
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
  return (
    <div className="card mt-6 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Request No.</th>
              <th className="px-4 py-3 font-medium">ลูกค้า</th>
              <th className="px-4 py-3 font-medium">โทรศัพท์</th>
              <th className="px-4 py-3 font-medium">ประเภทคำร้อง</th>
              <th className="px-4 py-3 font-medium">พื้นที่</th>
              <th className="px-4 py-3 font-medium">ผู้รับผิดชอบ</th>
              <th className="px-4 py-3 font-medium">ผู้สำรวจ</th>
              <th className="px-4 py-3 font-medium">วันนัดสำรวจล่าสุด</th>
              <th className="px-4 py-3 font-medium">คิวปัจจุบัน</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 font-medium">สร้างเมื่อ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
            {requests.map((request) => (
              <tr key={request.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-brand-600">
                  <Link href={`/requests/${request.id}`} className="hover:underline">
                    {request.request_no}
                  </Link>
                </td>
                <td className="px-4 py-3">{request.customer_name}</td>
                <td className="px-4 py-3">{request.phone}</td>
                <td className="px-4 py-3">{REQUEST_TYPE_LABELS[request.request_type]}</td>
                <td className="px-4 py-3">{request.area_name}</td>
                <td className="px-4 py-3">{request.assignee_name}</td>
                <td className="px-4 py-3">{request.assigned_surveyor ?? '-'}</td>
                <td className="px-4 py-3">{formatSurveyDate(getCurrentSurveyDate(request))}</td>
                <td className="px-4 py-3">{getRequestQueueGroupLabel(getRequestQueueGroup(request.status))}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
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
                  </div>
                  {getCustomerDelaySummary(request) ? <p className="mt-1 text-xs text-slate-500">{getCustomerDelaySummary(request)}</p> : null}
                </td>
                <td className="px-4 py-3">{new Date(request.created_at).toLocaleString('th-TH')}</td>
              </tr>
            ))}
            {!requests.length && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={11}>
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
