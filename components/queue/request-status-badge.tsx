import { getRequestStatusLabel, RequestStatus } from '@/lib/requests/types';

type RequestStatusBadgeProps = {
  status: RequestStatus;
  className?: string;
};

const STATUS_TONE: Record<RequestStatus, string> = {
  NEW: 'bg-slate-100 text-slate-700',
  PENDING_SURVEY_REVIEW: 'bg-amber-100 text-amber-800',
  SURVEY_ACCEPTED: 'bg-sky-100 text-sky-800',
  SURVEY_DOCS_INCOMPLETE: 'bg-orange-100 text-orange-800',
  SURVEY_RESCHEDULE_REQUESTED: 'bg-violet-100 text-violet-800',
  SURVEY_COMPLETED: 'bg-emerald-100 text-emerald-800',
  WAIT_LAYOUT_DRAWING: 'bg-indigo-100 text-indigo-800',
  WAITING_TO_SEND_TO_KRABI: 'bg-cyan-100 text-cyan-800',
  SENT_TO_KRABI: 'bg-sky-100 text-sky-800',
  WAIT_KRABI_DOCUMENT_CHECK: 'bg-sky-100 text-sky-800',
  KRABI_NEEDS_DOCUMENT_FIX: 'bg-rose-100 text-rose-800',
  KRABI_IN_PROGRESS: 'bg-blue-100 text-blue-800',
  KRABI_ESTIMATION_COMPLETED: 'bg-blue-100 text-blue-800',
  BILL_ISSUED: 'bg-purple-100 text-purple-800',
  COORDINATED_WITH_CONSTRUCTION: 'bg-emerald-100 text-emerald-800',
  WAIT_DOCUMENT_REVIEW: 'bg-amber-100 text-amber-800',
  WAIT_DOCUMENT_FROM_CUSTOMER: 'bg-orange-100 text-orange-800',
  READY_FOR_SURVEY: 'bg-sky-100 text-sky-800',
  IN_SURVEY: 'bg-blue-100 text-blue-800',
  WAIT_CUSTOMER_FIX: 'bg-rose-100 text-rose-800',
  WAIT_FIX_REVIEW: 'bg-violet-100 text-violet-800',
  READY_FOR_RESURVEY: 'bg-indigo-100 text-indigo-800',
  WAIT_BILLING: 'bg-purple-100 text-purple-800',
  WAIT_ACTION_CONFIRMATION: 'bg-purple-100 text-purple-800',
  WAIT_MANAGER_REVIEW: 'bg-fuchsia-100 text-fuchsia-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800'
};

export function RequestStatusBadge({ status, className = '' }: RequestStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[status]} ${className}`.trim()}
    >
      {getRequestStatusLabel(status)}
    </span>
  );
}
