'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  approveAonangManagerFinalAction,
  approveAonangManagerPreKrabiAction,
  approveManagerOverloadForwardAction,
  approveManagerReviewAction,
  returnRequestForResurveyAction
} from '@/app/actions';
import { AreaResponsibleCell } from '@/components/area-responsible-cell';
import { QueueFilterChips } from '@/components/queue/queue-filter-chips';
import { RequestTypeFlowCell } from '@/components/queue/request-type-flow-cell';
import { RequestStatusBadge } from '@/components/queue/request-status-badge';
import { formatThaiDateTime } from '@/lib/datetime';
import { getResponsiblePersonName, isThirtyOneHundredRequestType, RequestStatus, ServiceRequest } from '@/lib/requests/types';

type ManagerRequestsPanelProps = {
  requests: ServiceRequest[];
};

const MANAGER_TABLE_COLUMNS = ['เลขคำร้อง', 'ลูกค้า', 'ประเภทคำร้อง', 'พื้นที่', 'สถานะ', 'จัดการ'] as const;

const MANAGER_FILTERS: Array<{ value: 'ALL' | RequestStatus; label: string }> = [
  { value: 'ALL', label: 'ทั้งหมด' },
  { value: 'SURVEY_OVERLOAD_REPORTED', label: 'รออนุมัติบันทึกโหลดเกิน' },
  { value: 'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL', label: 'อนุมัติก่อนส่งกระบี่' },
  { value: 'WAIT_AONANG_MANAGER_FINAL_APPROVAL', label: 'อนุมัติปิดงาน' },
  { value: 'WAIT_MANAGER_REVIEW', label: 'รอผู้จัดการตรวจ' }
];

export function ManagerRequestsPanel({ requests }: ManagerRequestsPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeFilter, setActiveFilter] = useState<'ALL' | RequestStatus>('ALL');
  const [confirmRequest, setConfirmRequest] = useState<ServiceRequest | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [returnRequest, setReturnRequest] = useState<ServiceRequest | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnActionError, setReturnActionError] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [krabiReferenceNo, setKrabiReferenceNo] = useState('');
  const [krabiReferenceError, setKrabiReferenceError] = useState<string | null>(null);

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
      label: 'อนุมัติส่งต่อ'
    };
  };

  const runManagerAction = (requestId: string, action: (formData: FormData) => Promise<void>, extraFields?: Record<string, string>) => {
    setActionError(null);
    setPendingRequestId(requestId);

    startTransition(async () => {
      const formData = new FormData();
      formData.set('request_id', requestId);
      formData.set('stay_on_queue', '1');
      if (extraFields) {
        for (const [key, value] of Object.entries(extraFields)) {
          formData.set(key, value);
        }
      }

      try {
        await action(formData);
        if (process.env.NODE_ENV === 'development') {
          console.info('[manager-queue] action success with stay_on_queue, no navigation expected', { requestId });
        }
        setConfirmRequest(null);
        setKrabiReferenceNo('');
        setKrabiReferenceError(null);
        setIsReturnModalOpen(false);
        setReturnRequest(null);
        setReturnReason('');
        setReturnActionError(null);
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'ไม่สามารถบันทึกการอนุมัติได้ กรุณาลองใหม่อีกครั้ง';
        if (action === returnRequestForResurveyAction) {
          setReturnActionError(message || 'ไม่สามารถส่งกลับคำร้องได้ กรุณาลองใหม่อีกครั้ง');
          return;
        }
        setActionError(message || 'ไม่สามารถบันทึกการอนุมัติได้ กรุณาลองใหม่อีกครั้ง');
      } finally {
        setPendingRequestId(null);
      }
    });
  };

  return (
    <section className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">งานรอผู้จัดการทั้งหมด</p>
          <p className="mt-2 text-3xl font-semibold text-brand-700">{summary.all}</p>
          <p className="text-xs text-slate-500">เจ้าของคิว: ผู้จัดการอ่าวนาง</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">รออนุมัติบันทึกโหลดเกิน</p>
          <p className="mt-2 text-3xl font-semibold text-amber-700">{summary.overload}</p>
          <p className="text-xs text-slate-500">สถานะ: รออนุมัติบันทึกโหลดเกิน</p>
        </article>
      </div>

      <QueueFilterChips active={activeFilter} onChange={setActiveFilter} options={MANAGER_FILTERS} />

      <div className="card overflow-hidden">
        {actionError ? <p className="border-b border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{actionError}</p> : null}
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                {MANAGER_TABLE_COLUMNS.map((column) => (
                  <th key={column} className={column === 'พื้นที่' ? 'w-64 px-4 py-3 font-medium' : 'whitespace-nowrap px-4 py-3 font-medium'}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {filteredRequests.map((request) => {
                const resolvedAction = resolveManagerAction(request);
                const requiresConfirm = request.status === 'SURVEY_OVERLOAD_REPORTED';
                const responsiblePersonName = getResponsiblePersonName(request);
                return (
                  <tr key={request.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-brand-700">
                      <Link
                        className="cursor-pointer transition-colors hover:text-brand-800 hover:underline"
                        href={`/requests/${request.id}`}
                      >
                        {request.request_no}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{request.customer_name}</td>
                    <td className="px-4 py-3 align-top"><RequestTypeFlowCell request={request} /></td>
                    <td className="max-w-0 px-4 py-3 align-top">
                      <AreaResponsibleCell areaName={request.area_name} responsiblePersonName={responsiblePersonName} />
                    </td>
                    <td className="px-4 py-3">
                      <RequestStatusBadge status={request.status} surveyFailureType={request.survey_failure_type} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {requiresConfirm ? (
                          <button
                            className="btn-primary"
                            disabled={isPending}
                            type="button"
                            onClick={() => {
                              setActionError(null);
                              setConfirmRequest(request);
                              setKrabiReferenceNo('');
                              setKrabiReferenceError(null);
                            }}
                          >
                            {resolvedAction.label}
                          </button>
                        ) : (
                          <>
                            <button
                              className="btn-primary"
                              disabled={isPending && pendingRequestId === request.id}
                              type="button"
                              onClick={() => runManagerAction(request.id, resolvedAction.action)}
                            >
                              {isPending && pendingRequestId === request.id ? 'กำลังบันทึก...' : resolvedAction.label}
                            </button>
                            {isThirtyOneHundredRequestType(request.request_type) &&
                            ['WAIT_MANAGER_REVIEW', 'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL'].includes(request.status) ? (
                              <button
                                className="btn-secondary"
                                disabled={isPending && pendingRequestId === request.id}
                                type="button"
                                onClick={() => {
                                  setReturnActionError(null);
                                  setReturnReason('');
                                  setReturnRequest(request);
                                  setIsReturnModalOpen(true);
                                }}
                              >
                                ส่งกลับให้ตรวจสอบใหม่
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filteredRequests.length && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={MANAGER_TABLE_COLUMNS.length}>
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
            <div className="mt-4">
              <label className="text-sm font-medium text-slate-700" htmlFor="krabi-reference-no">
                เลขที่หนังสือส่งกระบี่
              </label>
              <input
                className="input mt-2"
                id="krabi-reference-no"
                placeholder="เช่น กบ.123/2569"
                value={krabiReferenceNo}
                onChange={(event) => {
                  setKrabiReferenceNo(event.target.value);
                  if (krabiReferenceError) {
                    setKrabiReferenceError(null);
                  }
                }}
              />
              {krabiReferenceError ? <p className="mt-2 text-sm text-rose-700">{krabiReferenceError}</p> : null}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="btn-secondary"
                type="button"
                onClick={() => {
                  setConfirmRequest(null);
                  setKrabiReferenceNo('');
                  setKrabiReferenceError(null);
                }}
              >
                ยกเลิก
              </button>
              <button
                className="btn-primary"
                disabled={isPending && pendingRequestId === confirmRequest.id}
                type="button"
                onClick={() => {
                  const trimmedReferenceNo = krabiReferenceNo.trim();
                  if (!trimmedReferenceNo) {
                    setKrabiReferenceError('กรุณากรอกเลขที่หนังสือก่อนอนุมัติ');
                    return;
                  }

                  runManagerAction(confirmRequest.id, approveManagerOverloadForwardAction, {
                    manager_overload_approved_by: 'ผู้จัดการอ่าวนาง',
                    krabi_reference_no: trimmedReferenceNo
                  });
                }}
              >
                {isPending && pendingRequestId === confirmRequest.id ? 'กำลังบันทึก...' : 'อนุมัติบันทึกให้กระบี่ปรับปรุงระบบจำหน่าย'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isReturnModalOpen && returnRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
            <h4 className="text-lg font-semibold text-slate-900">ส่งกลับให้ตรวจสอบใหม่</h4>
            <p className="mt-2 text-sm text-slate-600">โปรดระบุสิ่งที่ต้องตรวจสอบเพิ่มเติมก่อนส่งกลับเข้าคิวสำรวจ</p>
            {returnActionError ? <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{returnActionError}</p> : null}
            <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="manager-return-reason">
              โปรดระบุสิ่งที่ต้องตรวจสอบเพิ่มเติม
            </label>
            <textarea
              className="input mt-2 min-h-24"
              id="manager-return-reason"
              value={returnReason}
              onChange={(event) => setReturnReason(event.target.value)}
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="btn-secondary"
                type="button"
                onClick={() => {
                  setIsReturnModalOpen(false);
                  setReturnRequest(null);
                  setReturnReason('');
                  setReturnActionError(null);
                }}
              >
                ยกเลิก
              </button>
              <button
                className="btn-primary"
                disabled={isPending && pendingRequestId === returnRequest.id}
                type="button"
                onClick={() =>
                  runManagerAction(returnRequest.id, returnRequestForResurveyAction, {
                    manager_returned_by: 'ผู้จัดการอ่าวนาง',
                    manager_return_reason: returnReason
                  })
                }
              >
                {isPending && pendingRequestId === returnRequest.id ? 'กำลังบันทึก...' : 'ยืนยันส่งกลับ'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
