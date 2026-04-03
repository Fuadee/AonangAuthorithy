import type { AreaCode } from '@/lib/requests/areas';

export const REQUEST_STATUSES = [
  'NEW',
  'PENDING_SURVEY_REVIEW',
  'SURVEY_ACCEPTED',
  'SURVEY_DOCS_INCOMPLETE',
  'SURVEY_RESCHEDULE_REQUESTED',
  'SURVEY_COMPLETED',
  'WAIT_DOCUMENT_REVIEW',
  'WAIT_DOCUMENT_FROM_CUSTOMER',
  'READY_FOR_SURVEY',
  'IN_SURVEY',
  'WAIT_CUSTOMER_FIX',
  'WAIT_FIX_REVIEW',
  'READY_FOR_RESURVEY',
  'WAIT_BILLING',
  'WAIT_ACTION_CONFIRMATION',
  'WAIT_MANAGER_REVIEW',
  'COMPLETED'
] as const;
export const REQUEST_TYPES = ['METER', 'EXPANSION'] as const;
export const REQUEST_QUEUE_GROUPS = ['SURVEY', 'BILLING', 'MANAGER', 'DONE', 'OTHER'] as const;
export const DOCUMENT_STATUSES = ['COMPLETE', 'INCOMPLETE'] as const;
export const SURVEY_RESULTS = ['PASS', 'FAIL'] as const;
export const FIX_VERIFICATION_MODES = ['PHOTO_OR_RESURVEY', 'RESURVEY_ONLY'] as const;
export const PHOTO_REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export const FIX_APPROVAL_SOURCES = ['PHOTO', 'RESURVEY'] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type RequestType = (typeof REQUEST_TYPES)[number];
export type RequestQueueGroup = (typeof REQUEST_QUEUE_GROUPS)[number];
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];
export type SurveyResult = (typeof SURVEY_RESULTS)[number];
export type FixVerificationMode = (typeof FIX_VERIFICATION_MODES)[number];
export type PhotoReviewStatus = (typeof PHOTO_REVIEW_STATUSES)[number];
export type FixApprovalSource = (typeof FIX_APPROVAL_SOURCES)[number];

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  METER: 'ขอมิเตอร์',
  EXPANSION: 'ขอขยายเขต'
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  NEW: 'คำร้องใหม่',
  PENDING_SURVEY_REVIEW: 'รอตรวจเอกสารโดยนักสำรวจ',
  SURVEY_ACCEPTED: 'นักสำรวจรับงานแล้ว',
  SURVEY_DOCS_INCOMPLETE: 'เอกสารไม่ครบ',
  SURVEY_RESCHEDULE_REQUESTED: 'ขอเลื่อนวันสำรวจ',
  SURVEY_COMPLETED: 'สำรวจแล้ว',
  WAIT_DOCUMENT_REVIEW: 'รอตรวจเอกสารก่อนรับงาน',
  WAIT_DOCUMENT_FROM_CUSTOMER: 'รอผู้ใช้ไฟนำเอกสารมาให้',
  READY_FOR_SURVEY: 'พร้อมรับงานสำรวจ',
  IN_SURVEY: 'กำลังสำรวจหน้างาน',
  WAIT_CUSTOMER_FIX: 'รอผู้ใช้ไฟแก้ไข',
  WAIT_FIX_REVIEW: 'รอตรวจจากรูป/ข้อมูลที่ส่งมา',
  READY_FOR_RESURVEY: 'รอนัดตรวจซ้ำ',
  WAIT_BILLING: 'รอออกใบแจ้งหนี้',
  WAIT_ACTION_CONFIRMATION: 'รอดำเนินการหลังแจ้งหนี้',
  WAIT_MANAGER_REVIEW: 'รอผู้จัดการตรวจ',
  COMPLETED: 'เสร็จสิ้น'
};

export const REQUEST_QUEUE_GROUP_LABELS: Record<RequestQueueGroup, string> = {
  SURVEY: 'คิวนักสำรวจ',
  BILLING: 'คิวการเงิน',
  MANAGER: 'คิวผู้จัดการ',
  DONE: 'เสร็จสิ้น',
  OTHER: 'อื่น ๆ'
};

export const REQUEST_STATUS_QUEUE_GROUP: Record<RequestStatus, RequestQueueGroup> = {
  NEW: 'OTHER',
  PENDING_SURVEY_REVIEW: 'SURVEY',
  SURVEY_ACCEPTED: 'SURVEY',
  SURVEY_DOCS_INCOMPLETE: 'SURVEY',
  SURVEY_RESCHEDULE_REQUESTED: 'SURVEY',
  SURVEY_COMPLETED: 'SURVEY',
  WAIT_DOCUMENT_REVIEW: 'SURVEY',
  WAIT_DOCUMENT_FROM_CUSTOMER: 'SURVEY',
  READY_FOR_SURVEY: 'SURVEY',
  IN_SURVEY: 'SURVEY',
  WAIT_CUSTOMER_FIX: 'SURVEY',
  WAIT_FIX_REVIEW: 'SURVEY',
  READY_FOR_RESURVEY: 'SURVEY',
  WAIT_BILLING: 'BILLING',
  WAIT_ACTION_CONFIRMATION: 'BILLING',
  WAIT_MANAGER_REVIEW: 'MANAGER',
  COMPLETED: 'DONE'
};

export function getRequestQueueGroup(status: RequestStatus): RequestQueueGroup {
  return REQUEST_STATUS_QUEUE_GROUP[status];
}

export function getRequestQueueGroupLabel(queue: RequestQueueGroup): string {
  return REQUEST_QUEUE_GROUP_LABELS[queue];
}

export function getStatusesByQueueGroup(queue: RequestQueueGroup): RequestStatus[] {
  return REQUEST_STATUSES.filter((status) => REQUEST_STATUS_QUEUE_GROUP[status] === queue);
}

export const SURVEYOR_VISIBLE_STATUSES: RequestStatus[] = getStatusesByQueueGroup('SURVEY');
export const BILLING_VISIBLE_STATUSES: RequestStatus[] = getStatusesByQueueGroup('BILLING');
export const MANAGER_VISIBLE_STATUSES: RequestStatus[] = getStatusesByQueueGroup('MANAGER');
export const SURVEY_MAP_ELIGIBLE_STATUSES: RequestStatus[] = getStatusesByQueueGroup('SURVEY');
export const SURVEY_MAP_DEFAULT_STATUSES: RequestStatus[] = ['IN_SURVEY'];

export function getSurveyMapStatusesFromQuery(rawStatus: string | null | undefined): RequestStatus[] {
  if (!rawStatus?.trim()) {
    return SURVEY_MAP_DEFAULT_STATUSES;
  }

  const parsedStatuses = rawStatus
    .split(',')
    .map((status) => status.trim())
    .filter((status): status is RequestStatus => REQUEST_STATUSES.includes(status as RequestStatus));

  const filteredStatuses = parsedStatuses.filter((status) => SURVEY_MAP_ELIGIBLE_STATUSES.includes(status));
  return filteredStatuses.length ? filteredStatuses : SURVEY_MAP_DEFAULT_STATUSES;
}

export function getRequestStatusLabel(status: RequestStatus): string {
  return REQUEST_STATUS_LABELS[status];
}

export function isInvoiceSigned(request: Pick<ServiceRequest, 'invoice_signed_at'>): boolean {
  return Boolean(request.invoice_signed_at);
}

export function isPaid(request: Pick<ServiceRequest, 'paid_at'>): boolean {
  return Boolean(request.paid_at);
}

export function isDocumentComplete(request: Pick<ServiceRequest, 'document_status'>): boolean {
  return request.document_status === 'COMPLETE';
}

export function hasCollectedDocsOnSite(request: Pick<ServiceRequest, 'collect_docs_on_site'>): boolean {
  return request.collect_docs_on_site;
}

export function hasPinnedLocation(request: Pick<ServiceRequest, 'latitude' | 'longitude'>): boolean {
  return request.latitude !== null && request.longitude !== null;
}

export function getCurrentSurveyDate(
  request: Pick<ServiceRequest, 'survey_date_current' | 'scheduled_survey_date'>
): string | null {
  return request.survey_date_current ?? request.scheduled_survey_date;
}

export function hasSurveyBeenRescheduled(
  request: Pick<ServiceRequest, 'previous_survey_date' | 'survey_date_initial' | 'survey_date_current' | 'scheduled_survey_date'>
): boolean {
  if (request.previous_survey_date) {
    return true;
  }

  const initialDate = request.survey_date_initial ?? request.scheduled_survey_date;
  const currentDate = getCurrentSurveyDate(request);
  return Boolean(initialDate && currentDate && initialDate !== currentDate);
}

export function canStartSurvey(
  request: Pick<ServiceRequest, 'status' | 'survey_date_current' | 'scheduled_survey_date'>
): boolean {
  return request.status === 'READY_FOR_SURVEY' && Boolean(getCurrentSurveyDate(request));
}

export function needsRescheduleAfterDocuments(
  request: Pick<ServiceRequest, 'status' | 'documents_received_at' | 'survey_date_current' | 'scheduled_survey_date'>
): boolean {
  return request.status === 'READY_FOR_SURVEY' && Boolean(request.documents_received_at) && !getCurrentSurveyDate(request);
}

export function getSurveyScheduleSummary(
  request: Pick<
    ServiceRequest,
    | 'status'
    | 'survey_date_initial'
    | 'survey_date_current'
    | 'previous_survey_date'
    | 'scheduled_survey_date'
    | 'survey_reschedule_reason'
  >
): { label: string; tone: 'neutral' | 'warning' | 'success' } {
  if (request.status === 'WAIT_DOCUMENT_FROM_CUSTOMER') {
    return { label: 'รอเอกสารจากผู้ใช้ไฟ', tone: 'warning' };
  }

  if (hasSurveyBeenRescheduled(request)) {
    return { label: request.survey_reschedule_reason ? `เลื่อนนัด: ${request.survey_reschedule_reason}` : 'เลื่อนนัด', tone: 'warning' };
  }

  if (getCurrentSurveyDate(request)) {
    return { label: 'นัดสำรวจแล้ว', tone: 'success' };
  }

  return { label: 'ยังไม่กำหนดวันสำรวจ', tone: 'neutral' };
}

export function getCustomerDelaySummary(
  request: Pick<ServiceRequest, 'status' | 'awaiting_customer_documents_since' | 'documents_received_at'>
): string | null {
  if (request.status === 'WAIT_DOCUMENT_FROM_CUSTOMER') {
    return request.awaiting_customer_documents_since
      ? `รอเอกสารจากผู้ใช้ไฟตั้งแต่ ${new Date(request.awaiting_customer_documents_since).toLocaleString('th-TH')}`
      : 'รอเอกสารจากผู้ใช้ไฟ';
  }

  if (request.documents_received_at) {
    return `ได้รับเอกสารจากผู้ใช้ไฟแล้วเมื่อ ${new Date(request.documents_received_at).toLocaleString('th-TH')}`;
  }

  return null;
}

export function canMoveToBilling(request: Pick<ServiceRequest, 'collect_docs_on_site' | 'document_status'>): boolean {
  if (!request.collect_docs_on_site) {
    return true;
  }

  return request.document_status === 'COMPLETE';
}

export function canMarkSurveyPassed(request: Pick<ServiceRequest, 'status' | 'request_type'>): boolean {
  return request.request_type === 'METER' && request.status === 'IN_SURVEY';
}

export function canMarkSurveyFailed(request: Pick<ServiceRequest, 'status' | 'request_type'>): boolean {
  return request.request_type === 'METER' && request.status === 'IN_SURVEY';
}

export function allowsPhotoApproval(
  request: Pick<ServiceRequest, 'fix_verification_mode'>
): boolean {
  return request.fix_verification_mode === 'PHOTO_OR_RESURVEY';
}

export function canApproveFixFromPhoto(
  request: Pick<ServiceRequest, 'status' | 'fix_verification_mode'>
): boolean {
  return request.status === 'WAIT_FIX_REVIEW' && allowsPhotoApproval(request);
}

export function needsResurvey(
  request: Pick<ServiceRequest, 'status' | 'fix_verification_mode'>
): boolean {
  return request.status === 'READY_FOR_RESURVEY' || request.fix_verification_mode === 'RESURVEY_ONLY';
}

export function getFinalApprovalSource(request: Pick<ServiceRequest, 'fix_approved_via' | 'survey_result'>): string {
  if (request.fix_approved_via === 'PHOTO') {
    return 'ผ่านจากรูป';
  }
  if (request.fix_approved_via === 'RESURVEY' || request.survey_result === 'PASS') {
    return 'ผ่านจากตรวจซ้ำหน้างาน';
  }
  return '-';
}

export function getPostSurveyFixSummary(
  request: Pick<
    ServiceRequest,
    | 'survey_result'
    | 'customer_fix_note'
    | 'fix_verification_mode'
    | 'customer_fix_reported_at'
    | 'photo_review_status'
    | 'photo_reviewed_by'
    | 'photo_reviewed_at'
    | 'fix_approved_via'
  >
): {
  surveyResultLabel: string;
  fixVerificationModeLabel: string;
  photoReviewStatusLabel: string;
  finalApprovalSourceLabel: string;
  customerFixNote: string;
  customerFixReportedAt: string;
  photoReviewedBy: string;
  photoReviewedAt: string;
} {
  return {
    surveyResultLabel: request.survey_result === 'PASS' ? 'ผ่าน' : request.survey_result === 'FAIL' ? 'ไม่ผ่าน' : '-',
    fixVerificationModeLabel:
      request.fix_verification_mode === 'PHOTO_OR_RESURVEY'
        ? 'ส่งรูปได้ หรือ นัดตรวจซ้ำ'
        : request.fix_verification_mode === 'RESURVEY_ONLY'
          ? 'ต้องตรวจซ้ำหน้างานเท่านั้น'
          : '-',
    photoReviewStatusLabel:
      request.photo_review_status === 'APPROVED'
        ? 'ผ่าน'
        : request.photo_review_status === 'REJECTED'
          ? 'ไม่ผ่าน'
          : request.photo_review_status === 'PENDING'
            ? 'รอตรวจ'
            : '-',
    finalApprovalSourceLabel: getFinalApprovalSource(request),
    customerFixNote: request.customer_fix_note ?? '-',
    customerFixReportedAt: request.customer_fix_reported_at ? new Date(request.customer_fix_reported_at).toLocaleString('th-TH') : '-',
    photoReviewedBy: request.photo_reviewed_by ?? '-',
    photoReviewedAt: request.photo_reviewed_at ? new Date(request.photo_reviewed_at).toLocaleString('th-TH') : '-'
  };
}

export type DocumentReviewDecision = 'COMPLETE' | 'INCOMPLETE_COLLECT_ON_SITE' | 'INCOMPLETE_WAIT_CUSTOMER';

export function resolveDocumentReviewDecision(decision: DocumentReviewDecision): {
  documentStatus: DocumentStatus;
  collectDocsOnSite: boolean;
  nextStatus: Extract<RequestStatus, 'READY_FOR_SURVEY' | 'WAIT_DOCUMENT_FROM_CUSTOMER'>;
} {
  if (decision === 'COMPLETE') {
    return {
      documentStatus: 'COMPLETE',
      collectDocsOnSite: false,
      nextStatus: 'READY_FOR_SURVEY'
    };
  }

  if (decision === 'INCOMPLETE_COLLECT_ON_SITE') {
    return {
      documentStatus: 'INCOMPLETE',
      collectDocsOnSite: true,
      nextStatus: 'READY_FOR_SURVEY'
    };
  }

  return {
    documentStatus: 'INCOMPLETE',
    collectDocsOnSite: false,
    nextStatus: 'WAIT_DOCUMENT_FROM_CUSTOMER'
  };
}

export function getDocumentStatusSummary(
  request: Pick<ServiceRequest, 'document_status' | 'collect_docs_on_site' | 'incomplete_docs_note'>
): {
  documentStatusLabel: string;
  collectDocsOnSiteLabel: string;
  incompleteDocsNote: string | null;
} {
  return {
    documentStatusLabel: request.document_status === null ? '-' : isDocumentComplete(request) ? 'ครบ' : 'ไม่ครบ',
    collectDocsOnSiteLabel: request.collect_docs_on_site ? 'ใช่' : 'ไม่ใช่',
    incompleteDocsNote: request.incomplete_docs_note
  };
}

export function canMoveToManagerReview(
  request: Pick<ServiceRequest, 'invoice_signed_at' | 'paid_at'>
): boolean {
  return isInvoiceSigned(request) && isPaid(request);
}

// หลังออกใบแจ้งหนี้ งาน “เซ็น” และ “ชำระ” เป็นเงื่อนไขขนานที่ทำสลับลำดับได้ จึง resolve ด้วย flags ไม่ใช่ status ต่อกัน
export function resolvePostBillingPhase(
  request: Pick<ServiceRequest, 'invoice_signed_at' | 'paid_at'>
): Extract<RequestStatus, 'WAIT_ACTION_CONFIRMATION' | 'WAIT_MANAGER_REVIEW'> {
  return canMoveToManagerReview(request) ? 'WAIT_MANAGER_REVIEW' : 'WAIT_ACTION_CONFIRMATION';
}

export type Area = {
  id: string;
  code: AreaCode;
  name: string;
};

export type Assignee = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
};

export type ServiceRequest = {
  id: string;
  request_no: string;
  customer_name: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  location_note: string | null;
  area_name: string;
  assignee_name: string;
  assigned_surveyor: string | null;
  scheduled_survey_date: string | null;
  survey_date_initial: string | null;
  survey_date_current: string | null;
  previous_survey_date: string | null;
  survey_rescheduled_at: string | null;
  survey_reschedule_reason: string | null;
  documents_received_at: string | null;
  awaiting_customer_documents_since: string | null;
  status: RequestStatus;
  request_type: RequestType;
  survey_note: string | null;
  survey_reschedule_date: string | null;
  survey_reviewed_at: string | null;
  survey_completed_at: string | null;
  survey_result: SurveyResult | null;
  fix_verification_mode: FixVerificationMode | null;
  customer_fix_note: string | null;
  customer_fix_reported_at: string | null;
  photo_review_status: PhotoReviewStatus | null;
  photo_reviewed_at: string | null;
  photo_reviewed_by: string | null;
  fix_approved_via: FixApprovalSource | null;
  document_status: DocumentStatus | null;
  collect_docs_on_site: boolean;
  incomplete_docs_note: string | null;
  billing_amount: number | null;
  billing_note: string | null;
  billed_at: string | null;
  billed_by: string | null;
  invoice_signed_at: string | null;
  invoice_signed_by: string | null;
  paid_at: string | null;
  paid_by: string | null;
  created_at: string;
  updated_at: string;
};
