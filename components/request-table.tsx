import Link from 'next/link';
import {
  getRequestQueueGroup,
  getRequestQueueGroupLabel,
  getRequestStatusLabel,
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
              <th className="px-4 py-3 font-medium">วันสำรวจ</th>
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
                <td className="px-4 py-3">{formatSurveyDate(request.scheduled_survey_date)}</td>
                <td className="px-4 py-3">{getRequestQueueGroupLabel(getRequestQueueGroup(request.status))}</td>
                <td className="px-4 py-3">{getRequestStatusLabel(request.status)}</td>
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
