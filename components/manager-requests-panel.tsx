'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  approveAonangManagerFinalAction,
  approveAonangManagerPreKrabiAction,
  approveManagerOverloadForwardAction,
  approveManagerReviewAction
} from '@/app/actions';
import { RequestTypeFlowCell } from '@/components/queue/request-type-flow-cell';
import { resolveAreaDisplayName } from '@/lib/requests/areas';
import { RequestStatusBadge } from '@/components/queue/request-status-badge';
import { formatThaiDateTime } from '@/lib/datetime';
import { RequestStatus, ServiceRequest } from '@/lib/requests/types';

type ManagerRequestsPanelProps = {
  requests: ServiceRequest[];
};

const MANAGER_FILTERS: Array<{ key: 'ALL' | RequestStatus; label: string }> = [
  { key: 'ALL', label: 'ทั้งหมด' },
  { key: 'SURVEY_OVERLOAD_REPORTED', label: 'รออนุมัติบันทึกโหลดเกิน' },
  { key: 'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL', label: 'อนุมัติก่อนส่งกระบี่' },
  { key: 'WAIT_AONANG_MANAGER_FINAL_APPROVAL', label: 'อนุมัติปิดงาน' },
  { key: 'WAIT_MANAGER_REVIEW', label: 'รอผู้จัดการตรวจ' }
];

export function ManagerRequestsPanel({ requests }: ManagerRequestsPanelProps) {
  const [activeFilter, setActiveFilter] = useState<'ALL' | RequestStatus>('ALL');
  const [confirmRequest, setConfirmRequest] = useState<ServiceRequest | null>(null);

  const filteredRequests = useMemo(
    () => (activeFilter === 'ALL' ? requests : requests.filter((request) => request.status === activeFilter)),
    [activeFilter, requests]
  );

  const summary = useMemo(
    () => ({
      all: requests.length,
      overload: requests.filter((request) => request.status === 'SURVEY_OVERLOAD_REPORTED').length
    }),
    [requests]
  );

  const resolveManagerAction = (request: ServiceRequest) => {
    if (request.status === 'SURVEY_OVERLOAD_REPORTED') {
      return {
        action: approveManagerOverloadForwardAction,
        label: 'อนุมัติบันทึกให้กระบี่ปรับปรุงระบบจำหน่าย'
      };
    }
    if (request.status === 'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL') {
      return {
        action: approveAonangManagerPreKrabiAction,
        label: 'อนุมัติก่อนส่งกระบี่'
      };
    }
    if (request.status === 'WAIT_AONANG_MANAGER_FINAL_APPROVAL') {
      return {
        action: approveAonangManagerFinalAction,
        label: 'อนุมัติจ่ายมิเตอร์'
      };
    }

    return {
      action: approveManagerReviewAction,
      label: 'อนุมัติแล้ว'
    };
  };

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">งานรอผู้จัดการทั้งหมด</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.all}</p>
          <p className="text-xs text-slate-500">เจ้าของคิว: ผู้จัดการอ่าวนาง</p>
        </article>
        <article className="rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-4">
          <p className="text-sm text-fuchsia-700">รออนุมัติบันทึกโหลดเกิน</p>
          <p className="mt-1 text-2xl font-semibold text-fuchsia-900">{summary.overload}</p>
          <p className="text-xs text-fuchsia-700">สถานะ: รออนุมัติบันทึกโหลดเกิน</p>
        </article>
      </div>

      <div className="flex flex-wrap gap-2">
        {MANAGER_FILTERS.map((filter) => (
          <button
            key={filter.key}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              activeFilter === filter.key ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-700'
            }`}
            type="button"
            onClick={() => setActiveFilter(filter.key)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
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
              {filteredRequests.map((request) => {
                const resolvedAction = resolveManagerAction(request);
                const requiresConfirm = request.status === 'SURVEY_OVERLOAD_REPORTED';
                return (
                  <tr key={request.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-brand-700">{request.request_no}</td>
                    <td className="px-4 py-3">{request.customer_name}</td>
                    <td className="px-4 py-3 align-top">
                      <RequestTypeFlowCell className="max-w-[240px]" request={request} />
                    </td>
                    <td className="max-w-0 px-4 py-3" title={resolveAreaDisplayName(request.area_name)}>
                      <p className="truncate whitespace-nowrap">{resolveAreaDisplayName(request.area_name)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <RequestStatusBadge status={request.status} />
                    </td>
                    <td className="px-4 py-3">{formatThaiDateTime(request.updated_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link className="btn-secondary" href={`/requests/${request.id}`}>
                          เปิดดู
                        </Link>
                        {requiresConfirm ? (
                          <button className="btn-primary" type="button" onClick={() => setConfirmRequest(request)}>
                            {resolvedAction.label}
                          </button>
                        ) : (
                          <form action={resolvedAction.action}>
                            <input name="request_id" type="hidden" value={request.id} />
                            <button className="btn-primary" type="submit">
                              {resolvedAction.label}
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filteredRequests.length && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={7}>
                    ไม่มีงานที่ตรงกับตัวกรอง
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
            <h4 className="text-lg font-semibold text-slate-900">อนุมัติบันทึกโหลดเกิน</h4>
            <p className="mt-2 text-sm text-slate-600">ผู้จัดการอ่าวนางจะอนุมัติบันทึกเพื่อส่งต่อให้กระบี่ปรับปรุงระบบจำหน่าย</p>
            <dl className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <div>
                <dt className="text-slate-500">รายละเอียดเหตุผล/ข้อเท็จจริง</dt>
                <dd className="mt-1 whitespace-pre-wrap text-slate-900">{confirmRequest.overload_report_reason ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">หมายเหตุเพิ่มเติม</dt>
                <dd className="mt-1 whitespace-pre-wrap text-slate-900">{confirmRequest.overload_report_note ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">ผู้บันทึก / วันที่บันทึก</dt>
                <dd className="mt-1 text-slate-900">
                  {confirmRequest.overload_reported_by ?? '-'} / {formatThaiDateTime(confirmRequest.overload_reported_at)}
                </dd>
              </div>
            </dl>

            <form action={approveManagerOverloadForwardAction} className="mt-5 flex justify-end gap-2">
              <input name="request_id" type="hidden" value={confirmRequest.id} />
              <input name="manager_overload_approved_by" type="hidden" value="ผู้จัดการอ่าวนาง" />
              <button className="btn-secondary" type="button" onClick={() => setConfirmRequest(null)}>
                ยกเลิก
              </button>
              <button className="btn-primary" type="submit">
                อนุมัติบันทึกให้กระบี่ปรับปรุงระบบจำหน่าย
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
