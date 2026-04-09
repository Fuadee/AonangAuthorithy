'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BillingWorkflowActionRenderer } from '@/components/billing-workflow-action-renderer';
import { QueueFilterChips } from '@/components/queue/queue-filter-chips';
import { RequestTypeFlowCell } from '@/components/queue/request-type-flow-cell';
import { WorkflowActionButtons } from '@/components/workflow-action-buttons';
import { resolveAreaDisplayName } from '@/lib/requests/areas';
import {
  getRequestStatusLabel,
  isMeterLikeBillingRequest,
  RequestStatus,
  ServiceRequest
} from '@/lib/requests/types';
import { getWorkflowActionsForRequest } from '@/lib/requests/workflow-action-config';
import { formatThaiDate } from '@/lib/datetime';

type BillingRequestsPanelProps = {
  requests: ServiceRequest[];
};

type BillingQueueStatus = Extract<RequestStatus, 'WAIT_ELIGIBILITY_REVIEW' | 'WAIT_BILLING' | 'WAIT_ACTION_CONFIRMATION' | 'WAIT_PAYMENT'>;
type BillingFilter = 'ALL' | BillingQueueStatus;

const BILLING_FILTER_STATUSES: BillingQueueStatus[] = ['WAIT_ELIGIBILITY_REVIEW', 'WAIT_BILLING', 'WAIT_ACTION_CONFIRMATION', 'WAIT_PAYMENT'];

const FILTER_OPTIONS: Array<{ value: BillingFilter; label: string }> = [
  { value: 'ALL', label: 'ทั้งหมด' },
  ...BILLING_FILTER_STATUSES.map((status) => ({
    value: status,
    label: getRequestStatusLabel(status)
  }))
];


export function BillingRequestsPanel({ requests }: BillingRequestsPanelProps) {
  const [activeFilter, setActiveFilter] = useState<BillingFilter>('ALL');

  const summary = useMemo(
    () => ({
      waitBilling: requests.filter((request) => request.status === 'WAIT_BILLING').length,
      waitActionConfirmation: requests.filter((request) => request.status === 'WAIT_ACTION_CONFIRMATION').length,
      waitPayment: requests.filter((request) => request.status === 'WAIT_PAYMENT').length,
      waitEligibilityReview: requests.filter((request) => request.status === 'WAIT_ELIGIBILITY_REVIEW').length,
      totalBillingQueue: requests.length
    }),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    if (activeFilter === 'ALL') {
      return requests;
    }

    return requests.filter((request) => request.status === activeFilter);
  }, [activeFilter, requests]);

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-5">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="truncate whitespace-nowrap text-sm font-medium text-slate-500">รอตรวจสอบสิทธิ์</p>
          <p className="mt-2 text-3xl font-semibold text-cyan-700">{summary.waitEligibilityReview}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="truncate whitespace-nowrap text-sm font-medium text-slate-500">รอออกใบแจ้งหนี้</p>
          <p className="mt-2 text-3xl font-semibold text-purple-700">{summary.waitBilling}</p>
        </article>
        <article
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          title="รอลูกค้าชำระเงินตามใบแจ้งหนี้"
        >
          <p className="truncate whitespace-nowrap text-sm font-medium text-slate-500">รอชำระเงิน</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">{summary.waitActionConfirmation}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="truncate whitespace-nowrap text-sm font-medium text-slate-500">รอชำระเงิน (3 เฟส)</p>
          <p className="mt-2 text-3xl font-semibold text-indigo-700">{summary.waitPayment}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="truncate whitespace-nowrap text-sm font-medium text-slate-500">รวมทั้งหมด</p>
          <p className="mt-2 text-3xl font-semibold text-brand-700">{summary.totalBillingQueue}</p>
        </article>
      </section>

      <section className="card p-4">
        <QueueFilterChips active={activeFilter} onChange={setActiveFilter} options={FILTER_OPTIONS} />
      </section>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 font-medium">เลขคำร้อง</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">ชื่อลูกค้า</th>
                <th className="w-[220px] max-w-[220px] whitespace-nowrap px-4 py-3 font-medium">ประเภทคำร้อง</th>
                <th className="min-w-[140px] whitespace-nowrap px-4 py-3 font-medium">พื้นที่</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">วันที่ออกใบแจ้งหนี้</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">สถานะ</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-brand-700">
                    <Link className="hover:underline" href={`/requests/${request.id}`}>
                      {request.request_no}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{request.customer_name}</td>
                  <td className="w-[220px] max-w-[220px] px-4 py-3 align-top">
                    <RequestTypeFlowCell className="max-w-[220px]" request={request} />
                  </td>
                  <td className="min-w-[140px] whitespace-nowrap px-4 py-3" title={resolveAreaDisplayName(request.area_name)}>
                    {resolveAreaDisplayName(request.area_name)}
                  </td>
                  <td className="px-4 py-3">{formatThaiDate(request.billed_at)}</td>
                  <td className="px-4 py-3">{getRequestStatusLabel(request.status)}</td>
                  <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                    {isMeterLikeBillingRequest(request.request_type, request.status) ? (
                      <BillingWorkflowActionRenderer
                        compact
                        currentStatus={request.status}
                        isInvoiceSigned={request.invoice_signed_at !== null}
                        isPaid={request.paid_at !== null}
                        requestId={request.id}
                      />
                    ) : (
                      <WorkflowActionButtons
                        actions={getWorkflowActionsForRequest(request)}
                        compact
                        currentStatus={request.status}
                        requestId={request.id}
                        stayOnQueue
                      />
                    )}
                  </td>
                </tr>
              ))}
              {!filteredRequests.length && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={7}>
                    ไม่พบรายการตามตัวกรองนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
