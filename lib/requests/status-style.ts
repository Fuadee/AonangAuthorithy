import { DisplayStatus, RequestStatus, resolveDisplayStatus, ServiceRequest, WAITING_KRABI_DISPLAY_STATUS } from '@/lib/requests/types';

type SemanticTone = 'neutral' | 'info' | 'warning' | 'danger' | 'success' | 'accent';

const SEMANTIC_TONE_CLASS: Record<SemanticTone, string> = {
  neutral: 'border border-[#D1D5DB] bg-[#F3F4F6] text-[#374151]',
  info: 'border border-[#BFDBFE] bg-[#DBEAFE] text-[#1E40AF]',
  warning: 'border border-[#FCD34D] bg-[#FEF3C7] text-[#B45309]',
  danger: 'border border-[#FCA5A5] bg-[#FEE2E2] text-[#B91C1C]',
  success: 'border border-[#86EFAC] bg-[#DCFCE7] text-[#166534]',
  accent: 'border border-[#BFDBFE] bg-[#DBEAFE] text-[#1E40AF]'
};

const STATUS_SEMANTIC_TONE: Record<RequestStatus, SemanticTone> = {
  NEW: 'neutral',
  PENDING_SURVEY_REVIEW: 'warning',
  SURVEY_ACCEPTED: 'info',
  SURVEY_DOCS_INCOMPLETE: 'warning',
  SURVEY_RESCHEDULE_REQUESTED: 'warning',
  SURVEY_COMPLETED: 'success',
  WAIT_LAYOUT_DRAWING: 'warning',
  WAITING_TO_SEND_TO_KRABI: 'info',
  SENT_TO_KRABI: 'info',
  WAIT_KRABI_DOCUMENT_CHECK: 'info',
  KRABI_NEEDS_DOCUMENT_FIX: 'danger',
  KRABI_IN_PROGRESS: 'info',
  KRABI_ESTIMATION_COMPLETED: 'info',
  COORDINATED_WITH_CONSTRUCTION: 'success',
  WAIT_DOCUMENT_REVIEW: 'warning',
  WAIT_DOCUMENT_FROM_CUSTOMER: 'warning',
  READY_FOR_SURVEY: 'info',
  IN_SURVEY: 'info',
  WAIT_CUSTOMER_FIX: 'danger',
  WAIT_FIX_REVIEW: 'warning',
  READY_FOR_RESURVEY: 'warning',
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
  CHECK_3PHASE_CAPABILITY: 'warning',
  NEEDS_EXPANSION: 'warning',
  DESIGN_AND_ESTIMATE: 'info',
  INSTALLATION: 'info',
  INSPECTION: 'info',
  WAIT_MANAGER_REVIEW: 'warning',
  RETURNED_FOR_RESURVEY: 'danger',
  COMPLETED: 'success',
  COMPLETED_OVERLOAD_FORWARD: 'warning'
};

export function getRequestStatusToneClass(status: RequestStatus): string {
  return SEMANTIC_TONE_CLASS[STATUS_SEMANTIC_TONE[status]];
}

export function getDisplayStatusToneClass(status: DisplayStatus): string {
  if (status === WAITING_KRABI_DISPLAY_STATUS) {
    return SEMANTIC_TONE_CLASS.warning;
  }

  return getRequestStatusToneClass(status as RequestStatus);
}

export function getRequestStatusToneClassForDisplay(request: Pick<ServiceRequest, 'status' | 'survey_failure_type'>): string {
  return getDisplayStatusToneClass(resolveDisplayStatus(request));
}
