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
  isDocumentReady
}: MeterWorkflowActionsProps) {
  const resolvedActions = getWorkflowActionsForRequest({
    status: currentStatus,
    request_type: requestType,
    fix_verification_mode: fixVerificationMode,
    scheduled_survey_date: scheduledSurveyDate,
    survey_date_current: surveyDateCurrent,
    invoice_signed_at: isInvoiceSigned ? 'signed' : null,
    paid_at: isPaid ? 'paid' : null,
    is_document_ready: isDocumentReady
  });

  if (
    ![
      'WAIT_DOCUMENT_REVIEW',
      'SURVEY_COMPLETED',
      'WAIT_DOCUMENT_FROM_CUSTOMER',
      'READY_FOR_SURVEY',
      'IN_SURVEY',
      'WAIT_CUSTOMER_FIX',
      'WAIT_FIX_REVIEW',
      'READY_FOR_RESURVEY',
      'WAIT_BILLING',
      'WAIT_ACTION_CONFIRMATION',
      'WAIT_MANAGER_REVIEW',
      'WAIT_LAYOUT_DRAWING',
      'WAITING_TO_SEND_TO_KRABI',
      'SENT_TO_KRABI',
      'WAIT_KRABI_DOCUMENT_CHECK',
      'KRABI_NEEDS_DOCUMENT_FIX',
      'KRABI_IN_PROGRESS',
      'KRABI_ESTIMATION_COMPLETED',
      'BILL_ISSUED',
      'COORDINATED_WITH_CONSTRUCTION'
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
