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

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-700">{requestNo}</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{customerName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RequestTypeBadge requestType={requestType} />
          <RequestStatusBadge status={currentStatus} />
        </div>
      </header>

      <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm text-slate-600 sm:grid-cols-2">
        <div>
          <dt className="font-medium text-slate-500">พื้นที่</dt>
          <dd>{areaName}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">ผู้รับผิดชอบ</dt>
          <dd>{assigneeName}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">นักสำรวจ</dt>
          <dd>{surveyorName ?? '-'}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">อัปเดตล่าสุด</dt>
          <dd>{formatDateTime(updatedAt)}</dd>
        </div>
      </dl>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">สิ่งที่ต้องทำตอนนี้</p>
        <p className="mt-1 text-sm text-slate-700">{getWorkflowInstruction(currentStatus)}</p>
      </div>

      <div className="mt-4">
        <RequestCardActionPanel actions={actions} detailHref={detailHref} requestId={requestId} />
      </div>
    </article>
  );
}
