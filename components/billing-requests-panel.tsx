'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BillingWorkflowActionRenderer } from '@/components/billing-workflow-action-renderer';
import { getCurrentSurveyDate, getRequestStatusLabel, REQUEST_TYPE_LABELS, RequestStatus, ServiceRequest } from '@/lib/requests/types';

type BillingRequestsPanelProps = {
  requests: ServiceRequest[];
};

type BillingQueueStatus = Extract<RequestStatus, 'WAIT_BILLING' | 'WAIT_ACTION_CONFIRMATION'>;
type BillingFilter = 'ALL' | BillingQueueStatus;

const BILLING_FILTER_STATUSES: BillingQueueStatus[] = ['WAIT_BILLING', 'WAIT_ACTION_CONFIRMATION'];

const FILTER_OPTIONS: Array<{ value: BillingFilter; label: string }> = [
  { value: 'ALL', label: 'ทั้งหมด' },
  ...BILLING_FILTER_STATUSES.map((status) => ({
    value: status,
    label: getRequestStatusLabel(status)
  }))
];

function formatSurveyDate(value: string | null): string {
  if (!value) {
    return '-';
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString('th-TH', { dateStyle: 'medium' });
}

function formatCurrency(value: number | null): string {
  if (value === null) {
    return '-';
  }

  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 2
  }).format(value);
}

export function BillingRequestsPanel({ requests }: BillingRequestsPanelProps) {
  const [activeFilter, setActiveFilter] = useState<BillingFilter>('ALL');

  const summary = useMemo(
    () => ({
      waitBilling: requests.filter((request) => request.status === 'WAIT_BILLING').length,
      waitActionConfirmation: requests.filter((request) => request.status === 'WAIT_ACTION_CONFIRMATION').length,
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
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="truncate whitespace-nowrap text-sm font-medium text-slate-500">รอออกใบแจ้งหนี้</p>
          <p className="mt-2 text-3xl font-semibold text-purple-700">{summary.waitBilling}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="truncate whitespace-nowrap text-sm font-medium text-slate-500">รอดำเนินการ</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">{summary.waitActionConfirmation}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="truncate whitespace-nowrap text-sm font-medium text-slate-500">รวมทั้งหมด</p>
          <p className="mt-2 text-3xl font-semibold text-brand-700">{summary.totalBillingQueue}</p>
        </article>
      </section>

      <section className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          {FILTER_OPTIONS.map((option) => {
            const isActive = activeFilter === option.value;

            return (
              <button
                key={option.value}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  isActive
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
                type="button"
                onClick={() => setActiveFilter(option.value)}
                title={option.label}
              >
                <span className="block max-w-full truncate whitespace-nowrap">{option.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 font-medium">เลขคำร้อง</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">ชื่อลูกค้า</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">ประเภทคำร้อง</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">พื้นที่</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">นักสำรวจ</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">จำนวนเงินใบแจ้งหนี้</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">วันนัดล่าสุด</th>
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
                  <td className="px-4 py-3">{REQUEST_TYPE_LABELS[request.request_type]}</td>
                  <td className="px-4 py-3">{request.area_name}</td>
                  <td className="px-4 py-3">{request.assigned_surveyor ?? '-'}</td>
                  <td className="px-4 py-3">{formatCurrency(request.billing_amount)}</td>
                  <td className="px-4 py-3">{formatSurveyDate(getCurrentSurveyDate(request))}</td>
                  <td className="px-4 py-3">{getRequestStatusLabel(request.status)}</td>
                  <td className="px-4 py-3">
                    <BillingWorkflowActionRenderer
                      compact
                      currentStatus={request.status}
                      isInvoiceSigned={request.invoice_signed_at !== null}
                      isPaid={request.paid_at !== null}
                      requestId={request.id}
                    />
                  </td>
                </tr>
              ))}
              {!filteredRequests.length && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={9}>
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
