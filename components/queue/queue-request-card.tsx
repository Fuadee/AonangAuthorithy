import { RequestCardActionPanel } from '@/components/queue/request-card-action-panel';
import { RequestStatusBadge } from '@/components/queue/request-status-badge';
import { RequestTypeBadge } from '@/components/queue/request-type-badge';
import { getQueueWorkflowActions } from '@/lib/requests/workflow-action-config';
import { RequestStatus, RequestType } from '@/lib/requests/types';

export type QueueRequestCardProps = {
  requestId: string;
  requestNo: string;
  customerName: string;
  requestType: RequestType;
  areaName: string;
  assigneeName: string;
  surveyorName: string | null;
  updatedAt: string;
  currentStatus: RequestStatus;
  detailHref: string;
  workflowContext: {
    fixVerificationMode: 'PHOTO_OR_RESURVEY' | 'RESURVEY_ONLY' | null;
    scheduledSurveyDate: string | null;
    surveyDateCurrent: string | null;
    invoiceSignedAt: string | null;
    paidAt: string | null;
  };
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('th-TH');
}

export function QueueRequestCard({
  requestId,
  requestNo,
  customerName,
  requestType,
  areaName,
  assigneeName,
  surveyorName,
  updatedAt,
  currentStatus,
  detailHref,
  workflowContext
}: QueueRequestCardProps) {
  const actions = getQueueWorkflowActions({
    status: currentStatus,
    request_type: requestType,
    fix_verification_mode: workflowContext.fixVerificationMode,
    scheduled_survey_date: workflowContext.scheduledSurveyDate,
    survey_date_current: workflowContext.surveyDateCurrent,
    invoice_signed_at: workflowContext.invoiceSignedAt,
    paid_at: workflowContext.paidAt
  });
  const hasSurveyor = Boolean(surveyorName);
  const shouldShowSurveyor = hasSurveyor && surveyorName !== assigneeName;
  const compactMetaItems = [requestNo, customerName, `พื้นที่ ${areaName}`, assigneeName, shouldShowSurveyor ? surveyorName : null, formatDateTime(updatedAt)].filter(
    (item): item is string => Boolean(item)
  );

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <p className="text-sm text-slate-600 leading-6">
          <span className="font-semibold text-brand-700">{requestNo}</span>
          <span className="text-slate-400"> • </span>
          <span className="font-semibold text-slate-900">{customerName}</span>
          {compactMetaItems.slice(2).map((item) => (
            <span key={item}>
              <span className="text-slate-400"> • </span>
              <span>{item}</span>
            </span>
          ))}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <RequestTypeBadge requestType={requestType} />
          <RequestStatusBadge status={currentStatus} />
        </div>
      </header>

      <div className="mt-1.5">
        <RequestCardActionPanel actions={actions} compact currentStatus={currentStatus} detailHref={detailHref} requestId={requestId} />
      </div>
    </article>
  );
}
