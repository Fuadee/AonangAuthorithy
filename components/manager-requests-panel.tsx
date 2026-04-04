import Link from 'next/link';
import { approveManagerReviewAction } from '@/app/actions';
import { getRequestStatusLabel, REQUEST_TYPE_LABELS, ServiceRequest } from '@/lib/requests/types';

type ManagerRequestsPanelProps = {
  requests: ServiceRequest[];
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('th-TH');
}

export function ManagerRequestsPanel({ requests }: ManagerRequestsPanelProps) {
  return (
    <section className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 font-medium">เลขคำร้อง</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">ลูกค้า</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">ประเภทคำร้อง</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">พื้นที่</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">สถานะ</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">อัปเดตล่าสุด</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
            {requests.map((request) => (
              <tr key={request.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-brand-700">{request.request_no}</td>
                <td className="px-4 py-3">{request.customer_name}</td>
                <td className="px-4 py-3">{REQUEST_TYPE_LABELS[request.request_type]}</td>
                <td className="px-4 py-3">{request.area_name}</td>
                <td className="px-4 py-3">{getRequestStatusLabel(request.status)}</td>
                <td className="px-4 py-3">{formatDateTime(request.updated_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link className="btn-secondary" href={`/requests/${request.id}`}>
                      เปิดดู
                    </Link>
                    <form action={approveManagerReviewAction}>
                      <input name="request_id" type="hidden" value={request.id} />
                      <button className="btn-primary" type="submit">
                        อนุมัติแล้ว
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {!requests.length && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={7}>
                  ไม่มีงานที่รอผู้จัดการตรวจ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
