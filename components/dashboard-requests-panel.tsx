'use client';

import { useMemo, useState } from 'react';
import { DashboardSummary } from '@/components/dashboard-summary';
import { RequestTable } from '@/components/request-table';
import { getRequestQueueGroup, RequestType, ServiceRequest } from '@/lib/requests/types';

type RequestTypeFilter = 'ALL' | RequestType;
type WorkflowFilter = 'ALL' | 'WAIT_BILLING_ONLY' | 'WAIT_ACTION_CONFIRMATION_ONLY' | 'WAIT_MANAGER_REVIEW_ONLY';

type DashboardRequestsPanelProps = {
  requests: ServiceRequest[];
};

const FILTER_OPTIONS: Array<{ value: RequestTypeFilter; label: string }> = [
  { value: 'ALL', label: 'ทั้งหมด' },
  { value: 'METER', label: 'ขอมิเตอร์' },
  { value: 'EXPANSION', label: 'ขอขยายเขต' }
];

const WORKFLOW_FILTER_OPTIONS: Array<{ value: WorkflowFilter; label: string }> = [
  { value: 'ALL', label: 'ทุกสถานะ' },
  { value: 'WAIT_BILLING_ONLY', label: 'รอออกใบแจ้งหนี้' },
  { value: 'WAIT_ACTION_CONFIRMATION_ONLY', label: 'รอดำเนินการหลังแจ้งหนี้' },
  { value: 'WAIT_MANAGER_REVIEW_ONLY', label: 'รอผู้จัดการตรวจ' }
];

export function DashboardRequestsPanel({ requests }: DashboardRequestsPanelProps) {
  const [activeFilter, setActiveFilter] = useState<RequestTypeFilter>('ALL');
  const [workflowFilter, setWorkflowFilter] = useState<WorkflowFilter>('ALL');

  const filteredRequests = useMemo(() => {
    let result = requests;

    if (activeFilter !== 'ALL') {
      result = result.filter((request) => request.request_type === activeFilter);
    }

    if (workflowFilter === 'WAIT_BILLING_ONLY') {
      result = result.filter((request) => request.status === 'WAIT_BILLING');
    }

    if (workflowFilter === 'WAIT_ACTION_CONFIRMATION_ONLY') {
      result = result.filter((request) => request.status === 'WAIT_ACTION_CONFIRMATION');
    }

    if (workflowFilter === 'WAIT_MANAGER_REVIEW_ONLY') {
      result = result.filter((request) => request.status === 'WAIT_MANAGER_REVIEW');
    }

    return result;
  }, [activeFilter, workflowFilter, requests]);

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
  const surveyQueueCount = useMemo(
    () => requests.filter((request) => getRequestQueueGroup(request.status) === 'SURVEY').length,
    [requests]
  );
  const billingQueueCount = useMemo(
    () => requests.filter((request) => getRequestQueueGroup(request.status) === 'BILLING').length,
    [requests]
  );
  const managerQueueCount = useMemo(
    () => requests.filter((request) => getRequestQueueGroup(request.status) === 'MANAGER').length,
    [requests]
  );
  const waitBillingCount = useMemo(
    () => requests.filter((request) => request.status === 'WAIT_BILLING').length,
    [requests]
  );
  const waitActionConfirmationCount = useMemo(
    () => requests.filter((request) => request.status === 'WAIT_ACTION_CONFIRMATION').length,
    [requests]
  );

  return (
    <>
      <DashboardSummary
        totalCount={requests.length}
        meterCount={meterCount}
        expansionCount={expansionCount}
        surveyQueueCount={surveyQueueCount}
        billingQueueCount={billingQueueCount}
        managerQueueCount={managerQueueCount}
        pendingSurveyReviewCount={pendingSurveyReviewCount}
        waitBillingCount={waitBillingCount}
        waitActionConfirmationCount={waitActionConfirmationCount}
      />

      <section className="card space-y-3 p-4">
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

        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-600">มุมมองงาน:</p>
          {WORKFLOW_FILTER_OPTIONS.map((option) => {
            const isActive = workflowFilter === option.value;

            return (
              <button
                key={option.value}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  isActive
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
                type="button"
                onClick={() => setWorkflowFilter(option.value)}
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
