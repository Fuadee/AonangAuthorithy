'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BillingWorkflowActionRenderer } from '@/components/billing-workflow-action-renderer';
import { RequestTypeFlowCell } from '@/components/queue/request-type-flow-cell';
import { WorkflowActionButtons } from '@/components/workflow-action-buttons';
import { resolveAreaDisplayName } from '@/lib/requests/areas';
import { getRequestTypeDisplay } from '@/lib/requests/request-display';
import {
  getRequestStatusLabelForDisplay,
  isMeterLikeBillingRequest,
  ServiceRequest
} from '@/lib/requests/types';
import { getWorkflowActionsForRequest } from '@/lib/requests/workflow-action-config';
import { formatThaiDate } from '@/lib/datetime';

type BillingRequestsPanelProps = {
  requests: ServiceRequest[];
};

function buildBillingSearchText(request: ServiceRequest): string {
  return [
    request.request_no,
    request.customer_name,
    request.phone,
    request.house_number,
    request.village_no,
    request.road,
    request.landmark,
    request.area_name,
    resolveAreaDisplayName(request.area_name),
    request.request_type,
    request.request_intent,
    getRequestTypeDisplay(request),
    request.status,
    getRequestStatusLabelForDisplay(request)
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('th-TH');
}


export function BillingRequestsPanel({ requests }: BillingRequestsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

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
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('th-TH');
    if (!normalizedQuery) {
      return requests;
    }

    return requests.filter((request) => buildBillingSearchText(request).includes(normalizedQuery));
  }, [requests, searchQuery]);

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

      <section className="card overflow-hidden">
        <div className="border-b border-slate-200 bg-white p-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="ค้นหาเลขคำร้อง / ชื่อ / เบอร์โทร / บ้านเลขที่ / หมู่ / จุดสังเกต"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-10 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#1E40AF] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="ล้างคำค้นหา"
                title="ล้างคำค้นหา"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>
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
                  <td className="px-4 py-3">{getRequestStatusLabelForDisplay(request)}</td>
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
                    {searchQuery.trim() ? 'ไม่พบรายการที่ตรงกับคำค้นหา' : 'ไม่มีรายการในคิวการเงิน'}
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
