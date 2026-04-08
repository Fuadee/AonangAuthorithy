'use client';

import { BillingWorkflowActionRenderer } from '@/components/billing-workflow-action-renderer';
import { WorkflowActionButtons } from '@/components/workflow-action-buttons';
import { getWorkflowActionsForRequest } from '@/lib/requests/workflow-action-config';
import { RequestStatus, RequestType } from '@/lib/requests/types';

type MeterWorkflowActionsProps = {
  requestId: string;
  requestType: RequestType;
  currentStatus: RequestStatus;
  fixVerificationMode: 'PHOTO_OR_RESURVEY' | 'RESURVEY_ONLY' | null;
  scheduledSurveyDate: string | null;
  surveyDateCurrent: string | null;
  isInvoiceSigned: boolean;
  isPaid: boolean;
  isDocumentReady: boolean;
  threePhaseCapabilityResult: 'SUPPORTED' | 'UNSUPPORTED' | null;
};

export function MeterWorkflowActions({
  requestId,
  requestType,
  currentStatus,
  fixVerificationMode,
  scheduledSurveyDate,
  surveyDateCurrent,
  isInvoiceSigned,
  isPaid,
  isDocumentReady,
  threePhaseCapabilityResult
}: MeterWorkflowActionsProps) {
  const resolvedActions = getWorkflowActionsForRequest({
    status: currentStatus,
    request_type: requestType,
    fix_verification_mode: fixVerificationMode,
    scheduled_survey_date: scheduledSurveyDate,
    survey_date_current: surveyDateCurrent,
    invoice_signed_at: isInvoiceSigned ? 'signed' : null,
    paid_at: isPaid ? 'paid' : null,
    is_document_ready: isDocumentReady,
    three_phase_capability_result: threePhaseCapabilityResult
  });

  if (
    ![
      'WAIT_DOCUMENT_REVIEW',
      'SURVEY_COMPLETED',
      'WAIT_DOCUMENT_FROM_CUSTOMER',
      'READY_FOR_SURVEY',
      'IN_SURVEY',
      'CHECK_3PHASE_CAPABILITY',
      'WAIT_CUSTOMER_FIX',
      'WAIT_FIX_REVIEW',
      'READY_FOR_RESURVEY',
      'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL',
      'SENT_TO_KRABI',
      'WAIT_KRABI_APPROVAL',
      'KRABI_NEEDS_CORRECTION',
      'DOCUMENT_FIX',
      'RESENT_TO_KRABI',
      'KRABI_APPROVED',
      'WAIT_RECEIVE_FROM_KRABI',
      'WAIT_ELIGIBILITY_REVIEW',
      'WAIT_BILLING',
      'WAIT_PAYMENT',
      'WAIT_ACTION_CONFIRMATION',
      'WAIT_AONANG_MANAGER_FINAL_APPROVAL',
      'COMPLETED'
    ].includes(currentStatus)
  ) {
    return <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">สถานะนี้ยังไม่มีงานใน workflow</p>;
  }

  return (
    <>
      <WorkflowActionButtons actions={resolvedActions} currentStatus={currentStatus} requestId={requestId} />

      <div className="flex flex-wrap gap-2">
        <BillingWorkflowActionRenderer
          currentStatus={currentStatus}
          isInvoiceSigned={isInvoiceSigned}
          isPaid={isPaid}
          requestId={requestId}
        />
      </div>
    </>
  );
}
