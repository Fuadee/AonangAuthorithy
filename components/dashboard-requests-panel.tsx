'use client';

import { useMemo, useState } from 'react';
import { DashboardSummary } from '@/components/dashboard-summary';
import { RequestTable } from '@/components/request-table';
import { RequestType, ServiceRequest } from '@/lib/requests/types';

type RequestTypeFilter = 'ALL' | RequestType;

type DashboardRequestsPanelProps = {
  requests: ServiceRequest[];
};

const FILTER_OPTIONS: Array<{ value: RequestTypeFilter; label: string }> = [
  { value: 'ALL', label: 'ทั้งหมด' },
  { value: 'METER', label: 'ขอมิเตอร์' },
  { value: 'EXPANSION', label: 'ขอขยายเขต' }
];

export function DashboardRequestsPanel({ requests }: DashboardRequestsPanelProps) {
  const [activeFilter, setActiveFilter] = useState<RequestTypeFilter>('ALL');

  const filteredRequests = useMemo(() => {
    if (activeFilter === 'ALL') {
      return requests;
    }

    return requests.filter((request) => request.request_type === activeFilter);
  }, [activeFilter, requests]);

  const meterCount = useMemo(
    () => requests.filter((request) => request.request_type === 'METER').length,
    [requests]
  );
  const expansionCount = useMemo(
    () => requests.filter((request) => request.request_type === 'EXPANSION').length,
    [requests]
  );
  const pendingSurveyReviewCount = useMemo(
    () => requests.filter((request) => request.status === 'PENDING_SURVEY_REVIEW').length,
    [requests]
  );
  const surveyCompletedCount = useMemo(
    () => requests.filter((request) => request.status === 'SURVEY_COMPLETED').length,
    [requests]
  );

  return (
    <>
      <DashboardSummary
        totalCount={requests.length}
        meterCount={meterCount}
        expansionCount={expansionCount}
        pendingSurveyReviewCount={pendingSurveyReviewCount}
        surveyCompletedCount={surveyCompletedCount}
      />

      <section className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-600">กรองประเภทคำร้อง:</p>
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
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      <RequestTable requests={filteredRequests} />
    </>
  );
}
