import { RequestStatus } from '@/lib/requests/types';

type SemanticTone = 'neutral' | 'info' | 'warning' | 'danger' | 'success' | 'accent';

const SEMANTIC_TONE_CLASS: Record<SemanticTone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  info: 'bg-sky-100 text-sky-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-rose-100 text-rose-800',
  success: 'bg-emerald-100 text-emerald-800',
  accent: 'bg-indigo-100 text-indigo-800'
};

const STATUS_SEMANTIC_TONE: Record<RequestStatus, SemanticTone> = {
  NEW: 'neutral',
  PENDING_SURVEY_REVIEW: 'warning',
  SURVEY_ACCEPTED: 'info',
  SURVEY_DOCS_INCOMPLETE: 'warning',
  SURVEY_RESCHEDULE_REQUESTED: 'accent',
  SURVEY_COMPLETED: 'success',
  WAIT_LAYOUT_DRAWING: 'accent',
  WAITING_TO_SEND_TO_KRABI: 'info',
  SENT_TO_KRABI: 'info',
  WAIT_KRABI_DOCUMENT_CHECK: 'info',
  KRABI_NEEDS_DOCUMENT_FIX: 'danger',
  KRABI_IN_PROGRESS: 'info',
  KRABI_ESTIMATION_COMPLETED: 'info',
  BILL_ISSUED: 'accent',
  COORDINATED_WITH_CONSTRUCTION: 'success',
  WAIT_DOCUMENT_REVIEW: 'warning',
  WAIT_DOCUMENT_FROM_CUSTOMER: 'warning',
  READY_FOR_SURVEY: 'info',
  IN_SURVEY: 'info',
  WAIT_CUSTOMER_FIX: 'danger',
  WAIT_FIX_REVIEW: 'accent',
  READY_FOR_RESURVEY: 'accent',
  SURVEY_OVERLOAD_REPORTED: 'warning',
  WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL: 'warning',
  WAIT_KRABI_APPROVAL: 'info',
  KRABI_NEEDS_CORRECTION: 'danger',
  DOCUMENT_FIX: 'warning',
  RESENT_TO_KRABI: 'info',
  KRABI_APPROVED: 'success',
  WAIT_RECEIVE_FROM_KRABI: 'info',
  WAIT_ELIGIBILITY_REVIEW: 'info',
  WAIT_AONANG_MANAGER_FINAL_APPROVAL: 'warning',
  CHECK_3PHASE_CAPABILITY: 'accent',
  NEEDS_EXPANSION: 'warning',
  DESIGN_AND_ESTIMATE: 'info',
  WAIT_BILLING: 'accent',
  WAIT_PAYMENT: 'accent',
  INSTALLATION: 'info',
  INSPECTION: 'info',
  WAIT_ACTION_CONFIRMATION: 'accent',
  WAIT_MANAGER_REVIEW: 'warning',
  COMPLETED: 'success',
  COMPLETED_OVERLOAD_FORWARD: 'success'
};

export function getRequestStatusToneClass(status: RequestStatus): string {
  return SEMANTIC_TONE_CLASS[STATUS_SEMANTIC_TONE[status]];
}
