'use client';

import { useMemo, useState } from 'react';
import { DashboardSummary } from '@/components/dashboard-summary';
import { RequestTable } from '@/components/request-table';
import {
  getDashboardQueueGroups,
  getRequestQueueGroup,
  REQUEST_QUEUE_GROUP_META,
  RequestQueueGroup,
  RequestType,
  ServiceRequest
} from '@/lib/requests/types';

type RequestTypeFilter = 'ALL' | RequestType;
type QueueFilter = 'ALL' | RequestQueueGroup;

type DashboardRequestsPanelProps = {
  requests: ServiceRequest[];
  defaultQueue?: string | null;
};

const FILTER_OPTIONS: Array<{ value: RequestTypeFilter; label: string }> = [
  { value: 'ALL', label: 'ทั้งหมด' },
  { value: 'METER', label: 'ขอมิเตอร์' },
  { value: 'EXPANSION', label: 'ขอขยายเขต' }
];

const FILTER_BUTTON_BASE =
  'inline-flex min-w-0 items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium whitespace-nowrap transition';

export function DashboardRequestsPanel({ requests, defaultQueue }: DashboardRequestsPanelProps) {
  const [activeFilter, setActiveFilter] = useState<RequestTypeFilter>('ALL');
  const defaultQueueFilter: QueueFilter =
    defaultQueue && getDashboardQueueGroups().includes(defaultQueue as RequestQueueGroup)
      ? (defaultQueue as RequestQueueGroup)
      : 'ALL';
  const [queueFilter, setQueueFilter] = useState<QueueFilter>(defaultQueueFilter);

  const filteredRequests = useMemo(() => {
    let result = requests;

    if (activeFilter !== 'ALL') {
      result = result.filter((request) => request.request_type === activeFilter);
    }

    if (queueFilter !== 'ALL') {
      result = result.filter((request) => getRequestQueueGroup(request.status) === queueFilter);
    }

    return result;
  }, [activeFilter, queueFilter, requests]);

  const queueItems = useMemo(
    () =>
      getDashboardQueueGroups().map((queue) => {
        const meta = REQUEST_QUEUE_GROUP_META[queue];
        return {
          queue,
          label: meta.label,
          href: meta.href,
          toneClass: meta.toneClass,
          count: requests.filter((request) => getRequestQueueGroup(request.status) === queue).length
        };
      }),
    [requests]
  );

  return (
    <>
      <DashboardSummary queueItems={queueItems} />

      <section className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="pr-2 text-sm font-medium text-[#64748B] whitespace-nowrap">ประเภทคำร้อง</p>
          {FILTER_OPTIONS.map((option) => {
            const isActive = activeFilter === option.value;

            return (
              <button
                key={option.value}
                className={`${FILTER_BUTTON_BASE} ${
                  isActive
                    ? 'border-[#1E3A8A] bg-[#1E3A8A] text-white hover:bg-[#1D4ED8]'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
                type="button"
                onClick={() => setActiveFilter(option.value)}
                title={option.label}
              >
                <span className="max-w-full truncate">{option.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <p className="pr-2 text-sm font-medium text-[#64748B] whitespace-nowrap">ขั้นตอนหลัก</p>
          <button
            className={`${FILTER_BUTTON_BASE} ${
              queueFilter === 'ALL'
                ? 'border-[#1E3A8A] bg-[#1E3A8A] text-white hover:bg-[#1D4ED8]'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
            type="button"
            onClick={() => setQueueFilter('ALL')}
          >
            ทั้งหมด
          </button>
          {queueItems.map((item) => {
            const isActive = queueFilter === item.queue;

            return (
              <button
                key={item.queue}
                className={`${FILTER_BUTTON_BASE} ${
                  isActive
                    ? 'border-[#1E3A8A] bg-[#1E3A8A] text-white hover:bg-[#1D4ED8]'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
                type="button"
                onClick={() => setQueueFilter(item.queue)}
                title={item.label}
              >
                <span className="max-w-full truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <RequestTable requests={filteredRequests} />
    </>
  );
}
