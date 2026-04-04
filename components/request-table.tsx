'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getCurrentSurveyDate,
  getRequestQueueGroup,
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

function getStatusBadgeClass(request: ServiceRequest): string {
  if (request.status === 'COMPLETED') {
    return 'bg-emerald-100 text-emerald-700';
  }

  const queue = getRequestQueueGroup(request.status);
  if (queue === 'SURVEY') {
    return 'bg-blue-100 text-blue-700';
  }
  if (queue === 'BILLING') {
    return 'bg-amber-100 text-amber-700';
  }
  if (queue === 'MANAGER' || queue === 'KRABI') {
    return 'bg-indigo-100 text-indigo-700';
  }

  return 'bg-slate-100 text-slate-600';
}

export function RequestTable({ requests }: RequestTableProps) {
  const router = useRouter();

  return (
    <div className="card mt-6 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[22%]" />
            <col className="w-[14%]" />
            <col className="w-[16%]" />
            <col className="w-[14%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-3 text-sm font-medium text-[#64748B]">Request No.</th>
              <th className="px-4 py-3 text-sm font-medium text-[#64748B]">ลูกค้า</th>
              <th className="px-4 py-3 text-sm font-medium text-[#64748B]">ประเภท</th>
              <th className="px-4 py-3 text-sm font-medium text-[#64748B]">ผู้รับผิดชอบ</th>
              <th className="px-4 py-3 text-sm font-medium text-[#64748B]">วันนัดสำรวจ</th>
              <th className="px-4 py-3 text-sm font-medium text-[#64748B]">สถานะ</th>
            </tr>
          </thead>
          <tbody className="bg-white text-[#0F172A]">
            {requests.map((request) => (
              <tr
                key={request.id}
                className="cursor-pointer border-b border-[#E2E8F0] hover:bg-slate-50"
                onClick={() => router.push(`/requests/${request.id}`)}
              >
                <td className="max-w-0 px-4 py-3 align-middle" title={request.request_no}>
                  <Link
                    href={`/requests/${request.id}`}
                    className="block truncate whitespace-nowrap font-semibold text-[#1E3A8A] hover:underline"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {request.request_no}
                  </Link>
                </td>
                <td className="max-w-0 px-4 py-3 align-middle" title={request.customer_name}>
                  <p className="truncate whitespace-nowrap text-[#0F172A]">{request.customer_name}</p>
                </td>
                <td className="max-w-0 px-4 py-3 align-middle" title={REQUEST_TYPE_LABELS[request.request_type]}>
                  <p className="truncate whitespace-nowrap text-[#64748B]">{REQUEST_TYPE_LABELS[request.request_type]}</p>
                </td>
                <td className="max-w-0 px-4 py-3 align-middle" title={request.assignee_name}>
                  <p className="truncate whitespace-nowrap text-[#64748B]">{request.assignee_name}</p>
                </td>
                <td className="max-w-0 px-4 py-3 align-middle">
                  <p className="truncate whitespace-nowrap text-[#64748B]">{formatSurveyDate(getCurrentSurveyDate(request))}</p>
                </td>
                <td className="px-4 py-3 align-middle">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(request)}`}>
                    {getRequestStatusLabel(request.status)}
                  </span>
                </td>
              </tr>
            ))}
            {!requests.length && (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-[#64748B]" colSpan={6}>
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
