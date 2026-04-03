'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { DashboardSummary } from '@/components/dashboard-summary';
import { RequestTable } from '@/components/request-table';
import {
  getCurrentSurveyDate,
  getRequestQueueGroup,
  hasSurveyBeenRescheduled,
  RequestType,
  ServiceRequest,
  SURVEY_MAP_DEFAULT_STATUSES,
  SURVEY_MAP_ELIGIBLE_STATUSES
} from '@/lib/requests/types';

type RequestTypeFilter = 'ALL' | RequestType;
type WorkflowFilter =
  | 'ALL'
  | 'WAIT_DOCUMENT_REVIEW_ONLY'
  | 'WAIT_DOCUMENT_FROM_CUSTOMER_ONLY'
  | 'READY_TO_SCHEDULE_SURVEY_ONLY'
  | 'RESCHEDULED_SURVEY_ONLY'
  | 'IN_SURVEY_ONLY'
  | 'WAIT_CUSTOMER_FIX_ONLY'
  | 'WAIT_FIX_REVIEW_ONLY'
  | 'READY_FOR_RESURVEY_ONLY'
  | 'WAIT_BILLING_ONLY'
  | 'WAIT_ACTION_CONFIRMATION_ONLY'
  | 'WAIT_MANAGER_REVIEW_ONLY';

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
  { value: 'WAIT_DOCUMENT_REVIEW_ONLY', label: 'รอตรวจเอกสารก่อนรับงาน' },
  { value: 'WAIT_DOCUMENT_FROM_CUSTOMER_ONLY', label: 'รอผู้ใช้ไฟนำเอกสารมาให้' },
  { value: 'READY_TO_SCHEDULE_SURVEY_ONLY', label: 'พร้อมนัดสำรวจ' },
  { value: 'RESCHEDULED_SURVEY_ONLY', label: 'นัดสำรวจใหม่แล้ว' },
  { value: 'IN_SURVEY_ONLY', label: 'กำลังสำรวจ' },
  { value: 'WAIT_CUSTOMER_FIX_ONLY', label: 'รอผู้ใช้ไฟแก้ไข' },
  { value: 'WAIT_FIX_REVIEW_ONLY', label: 'รอตรวจจากรูป/ข้อมูลที่ส่งมา' },
  { value: 'READY_FOR_RESURVEY_ONLY', label: 'รอนัดตรวจซ้ำ' },
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

    if (workflowFilter === 'WAIT_DOCUMENT_REVIEW_ONLY') {
      result = result.filter((request) => request.status === 'WAIT_DOCUMENT_REVIEW');
    }

    if (workflowFilter === 'WAIT_DOCUMENT_FROM_CUSTOMER_ONLY') {
      result = result.filter((request) => request.status === 'WAIT_DOCUMENT_FROM_CUSTOMER');
    }

    if (workflowFilter === 'WAIT_BILLING_ONLY') {
      result = result.filter((request) => request.status === 'WAIT_BILLING');
    }
    if (workflowFilter === 'READY_TO_SCHEDULE_SURVEY_ONLY') {
      result = result.filter((request) => request.status === 'READY_FOR_SURVEY' && !getCurrentSurveyDate(request));
    }
    if (workflowFilter === 'RESCHEDULED_SURVEY_ONLY') {
      result = result.filter((request) => hasSurveyBeenRescheduled(request) && Boolean(getCurrentSurveyDate(request)));
    }
    if (workflowFilter === 'IN_SURVEY_ONLY') {
      result = result.filter((request) => request.status === 'IN_SURVEY');
    }
    if (workflowFilter === 'WAIT_CUSTOMER_FIX_ONLY') {
      result = result.filter((request) => request.status === 'WAIT_CUSTOMER_FIX');
    }
    if (workflowFilter === 'WAIT_FIX_REVIEW_ONLY') {
      result = result.filter((request) => request.status === 'WAIT_FIX_REVIEW');
    }
    if (workflowFilter === 'READY_FOR_RESURVEY_ONLY') {
      result = result.filter((request) => request.status === 'READY_FOR_RESURVEY');
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
  const waitDocumentReviewCount = useMemo(
    () => requests.filter((request) => request.status === 'WAIT_DOCUMENT_REVIEW').length,
    [requests]
  );
  const waitDocumentFromCustomerCount = useMemo(
    () => requests.filter((request) => request.status === 'WAIT_DOCUMENT_FROM_CUSTOMER').length,
    [requests]
  );
  const waitActionConfirmationCount = useMemo(
    () => requests.filter((request) => request.status === 'WAIT_ACTION_CONFIRMATION').length,
    [requests]
  );
  const readyToScheduleSurveyCount = useMemo(
    () => requests.filter((request) => request.status === 'READY_FOR_SURVEY' && !getCurrentSurveyDate(request)).length,
    [requests]
  );
  const rescheduledSurveyCount = useMemo(
    () => requests.filter((request) => hasSurveyBeenRescheduled(request) && Boolean(getCurrentSurveyDate(request))).length,
    [requests]
  );
  const inSurveyCount = useMemo(() => requests.filter((request) => request.status === 'IN_SURVEY').length, [requests]);
  const waitCustomerFixCount = useMemo(() => requests.filter((request) => request.status === 'WAIT_CUSTOMER_FIX').length, [requests]);
  const waitFixReviewCount = useMemo(() => requests.filter((request) => request.status === 'WAIT_FIX_REVIEW').length, [requests]);
  const readyForResurveyCount = useMemo(() => requests.filter((request) => request.status === 'READY_FOR_RESURVEY').length, [requests]);
  const approvedViaPhotoCount = useMemo(() => requests.filter((request) => request.fix_approved_via === 'PHOTO').length, [requests]);
  const surveyMapStatusParam = useMemo(() => {
    if (workflowFilter === 'IN_SURVEY_ONLY') {
      return 'IN_SURVEY';
    }

    if (workflowFilter === 'WAIT_CUSTOMER_FIX_ONLY') {
      return 'WAIT_CUSTOMER_FIX';
    }

    if (workflowFilter === 'WAIT_FIX_REVIEW_ONLY') {
      return 'WAIT_FIX_REVIEW';
    }

    if (workflowFilter === 'READY_FOR_RESURVEY_ONLY') {
      return 'READY_FOR_RESURVEY';
    }

    const statuses = workflowFilter === 'ALL' ? SURVEY_MAP_DEFAULT_STATUSES : SURVEY_MAP_ELIGIBLE_STATUSES;
    return statuses.join(',');
  }, [workflowFilter]);

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
        waitDocumentReviewCount={waitDocumentReviewCount}
        waitDocumentFromCustomerCount={waitDocumentFromCustomerCount}
        readyToScheduleSurveyCount={readyToScheduleSurveyCount}
        rescheduledSurveyCount={rescheduledSurveyCount}
        inSurveyCount={inSurveyCount}
        waitCustomerFixCount={waitCustomerFixCount}
        waitFixReviewCount={waitFixReviewCount}
        readyForResurveyCount={readyForResurveyCount}
        waitBillingCount={waitBillingCount}
        waitActionConfirmationCount={waitActionConfirmationCount}
        approvedViaPhotoCount={approvedViaPhotoCount}
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

          <Link className="btn-secondary ml-auto" href={`/survey/map?status=${encodeURIComponent(surveyMapStatusParam)}`}>
            ดูคิวนี้บนแผนที่
          </Link>
        </div>
      </section>

      <RequestTable requests={filteredRequests} />
    </>
  );
}
