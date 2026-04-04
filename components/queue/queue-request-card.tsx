import { RequestCardActionPanel } from '@/components/queue/request-card-action-panel';
import { RequestStatusBadge } from '@/components/queue/request-status-badge';
import { RequestTypeBadge } from '@/components/queue/request-type-badge';
import { getWorkflowInstruction, getQueueWorkflowActions } from '@/lib/requests/workflow-action-config';
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
  const compactMetaItems = [
    `พื้นที่ ${areaName}`,
    `ผู้รับผิดชอบ: ${assigneeName}`,
    shouldShowSurveyor ? `นักสำรวจ: ${surveyorName}` : null,
    `อัปเดต ${formatDateTime(updatedAt)}`
  ].filter(Boolean);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-3.5">
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div>
          <p className="text-sm font-semibold text-brand-700">{requestNo}</p>
          <p className="mt-0.5 text-base font-semibold text-slate-900 sm:text-lg">{customerName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RequestTypeBadge requestType={requestType} />
          <RequestStatusBadge status={currentStatus} />
        </div>
      </header>

      <p className="mt-2 text-sm text-slate-600">{compactMetaItems.join(' • ')}</p>

      <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
        <p className="text-sm text-slate-700">
          <span className="font-medium text-slate-800">สิ่งที่ต้องทำ:</span> {getWorkflowInstruction(currentStatus)}
        </p>
      </div>

      <div className="mt-2.5">
        <RequestCardActionPanel actions={actions} currentStatus={currentStatus} detailHref={detailHref} requestId={requestId} />
      </div>
    </article>
  );
}
