import type { AreaCode } from '@/lib/requests/areas';
import { getSurveyorDisplayName } from '@/lib/requests/surveyor-display';

export const REQUEST_STATUSES = [
  'NEW',
  'PENDING_SURVEY_REVIEW',
  'SURVEY_ACCEPTED',
  'SURVEY_DOCS_INCOMPLETE',
  'SURVEY_RESCHEDULE_REQUESTED',
  'SURVEY_COMPLETED',
  'WAIT_LAYOUT_DRAWING',
  'WAITING_TO_SEND_TO_KRABI',
  'SENT_TO_KRABI',
  'WAIT_KRABI_DOCUMENT_CHECK',
  'KRABI_NEEDS_DOCUMENT_FIX',
  'KRABI_IN_PROGRESS',
  'KRABI_ESTIMATION_COMPLETED',
  'BILL_ISSUED',
  'COORDINATED_WITH_CONSTRUCTION',
  'WAIT_DOCUMENT_REVIEW',
  'WAIT_DOCUMENT_FROM_CUSTOMER',
  'READY_FOR_SURVEY',
  'IN_SURVEY',
  'WAIT_CUSTOMER_FIX',
  'WAIT_FIX_REVIEW',
  'READY_FOR_RESURVEY',
  'SURVEY_OVERLOAD_REPORTED',
  'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL',
  'WAIT_KRABI_APPROVAL',
  'KRABI_NEEDS_CORRECTION',
  'DOCUMENT_FIX',
  'RESENT_TO_KRABI',
  'KRABI_APPROVED',
  'WAIT_RECEIVE_FROM_KRABI',
  'WAIT_ELIGIBILITY_REVIEW',
  'WAIT_AONANG_MANAGER_FINAL_APPROVAL',
  'CHECK_3PHASE_CAPABILITY',
  'NEEDS_EXPANSION',
  'DESIGN_AND_ESTIMATE',
  'WAIT_BILLING',
  'WAIT_PAYMENT',
  'INSTALLATION',
  'INSPECTION',
  'WAIT_ACTION_CONFIRMATION',
  'WAIT_MANAGER_REVIEW',
  'RETURNED_FOR_RESURVEY',
  'COMPLETED',
  'COMPLETED_OVERLOAD_FORWARD'
] as const;
import { formatDateOnly, formatThaiDateTime } from '@/lib/datetime';

export const REQUEST_TYPES = ['METER', 'METER_30_100_1P', 'METER_30_100_3P', 'METER_TO_3PHASE', 'EXPANSION'] as const;
export const FLOW_TYPES = ['METER', 'EXPANSION'] as const;
export const REQUEST_QUEUE_GROUPS = ['SURVEY', 'DISPATCH', 'KRABI', 'BILLING', 'MANAGER', 'DONE', 'OTHER'] as const;
export const DOCUMENT_STATUSES = ['COMPLETE', 'INCOMPLETE'] as const;
export const SURVEY_RESULTS = ['PASS', 'FAIL'] as const;
export const FIX_VERIFICATION_MODES = ['PHOTO_OR_RESURVEY', 'RESURVEY_ONLY'] as const;
export const PHOTO_REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export const FIX_APPROVAL_SOURCES = ['PHOTO', 'RESURVEY'] as const;
export const THREE_PHASE_CAPABILITY_RESULTS = ['SUPPORTED', 'UNSUPPORTED'] as const;
export const SURVEY_FAILURE_TYPES = ['NORMAL_FIX_REQUIRED', 'OVERLOAD_REPORTED'] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type RequestType = (typeof REQUEST_TYPES)[number];
export type FlowType = (typeof FLOW_TYPES)[number];
export type RequestQueueGroup = (typeof REQUEST_QUEUE_GROUPS)[number];
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];
export type SurveyResult = (typeof SURVEY_RESULTS)[number];
export type FixVerificationMode = (typeof FIX_VERIFICATION_MODES)[number];
export type PhotoReviewStatus = (typeof PHOTO_REVIEW_STATUSES)[number];
export type FixApprovalSource = (typeof FIX_APPROVAL_SOURCES)[number];
export type ThreePhaseCapabilityResult = (typeof THREE_PHASE_CAPABILITY_RESULTS)[number];
export type SurveyFailureType = (typeof SURVEY_FAILURE_TYPES)[number];
export type DocumentReviewMode = 'BASIC' | 'DETAILED';

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  METER: 'ขอมิเตอร์',
  METER_30_100_1P: 'ขอมิเตอร์ 30/100 (1 เฟส)',
  METER_30_100_3P: 'ขอมิเตอร์ 30/100 (3 เฟส)',
  METER_TO_3PHASE: 'งานเพิ่มเป็นมิเตอร์ 3 เฟส',
  EXPANSION: 'ขอขยายเขต'
};

export const FLOW_TYPE_LABELS: Record<FlowType, string> = {
  METER: 'มิเตอร์',
  EXPANSION: 'ขยายเขต'
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  NEW: 'คำร้องใหม่',
  PENDING_SURVEY_REVIEW: 'รอตรวจเอกสารโดยนักสำรวจ (สถานะเดิม)',
  SURVEY_ACCEPTED: 'นักสำรวจรับงานแล้ว (สถานะเดิม)',
  SURVEY_DOCS_INCOMPLETE: 'เอกสารไม่ครบ (สถานะเดิม)',
  SURVEY_RESCHEDULE_REQUESTED: 'ขอเลื่อนวันสำรวจ (สถานะเดิม)',
  SURVEY_COMPLETED: 'สำรวจแล้ว',
  WAIT_LAYOUT_DRAWING: 'รอวาดผัง',
  WAITING_TO_SEND_TO_KRABI: 'รอจัดส่งเอกสาร',
  SENT_TO_KRABI: 'ส่งเอกสารไปกระบี่แล้ว',
  WAIT_KRABI_DOCUMENT_CHECK: 'รอกระบี่ตรวจรับเอกสาร',
  KRABI_NEEDS_DOCUMENT_FIX: 'กระบี่ตีกลับให้แก้ไขเอกสาร',
  KRABI_IN_PROGRESS: 'กระบี่กำลังประมาณการ',
  KRABI_ESTIMATION_COMPLETED: 'กระบี่ประมาณการเสร็จแล้ว',
  BILL_ISSUED: 'ออกใบแจ้งหนี้แล้ว',
  COORDINATED_WITH_CONSTRUCTION: 'แล้วเสร็จ / ผกส.รับเรื่อง',
  WAIT_DOCUMENT_REVIEW: 'รอตรวจเอกสาร',
  WAIT_DOCUMENT_FROM_CUSTOMER: 'รอลูกค้านำเอกสาร',
  READY_FOR_SURVEY: 'พร้อมสำรวจ',
  IN_SURVEY: 'กำลังสำรวจ',
  WAIT_CUSTOMER_FIX: 'รอแก้ไขโดยลูกค้า',
  WAIT_FIX_REVIEW: 'ตรวจข้อมูล/แก้ไข',
  READY_FOR_RESURVEY: 'นัดสำรวจใหม่',
  SURVEY_OVERLOAD_REPORTED: 'รออนุมัติบันทึกโหลดเกิน',
  WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL: 'รอผู้จัดการอ่าวนางอนุมัติก่อนส่งกระบี่',
  WAIT_KRABI_APPROVAL: 'รอกระบี่อนุมัติ',
  KRABI_NEEDS_CORRECTION: 'กระบี่ตีกลับให้แก้ไขเอกสาร',
  DOCUMENT_FIX: 'แก้ไขเอกสาร',
  RESENT_TO_KRABI: 'ส่งเอกสารไปกระบี่ใหม่',
  KRABI_APPROVED: 'กระบี่อนุมัติแล้ว',
  WAIT_RECEIVE_FROM_KRABI: 'รอตรวจสอบสิทธิ์',
  WAIT_ELIGIBILITY_REVIEW: 'รอตรวจสอบสิทธิ์',
  WAIT_AONANG_MANAGER_FINAL_APPROVAL: 'รอผู้จัดการอ่าวนางอนุมัติ',
  CHECK_3PHASE_CAPABILITY: 'รอตรวจว่าระบบรองรับ 3 เฟสหรือไม่',
  NEEDS_EXPANSION: 'ต้องขยายเขต (รอส่งต่อ)',
  DESIGN_AND_ESTIMATE: 'ออกแบบ / ประเมิน',
  WAIT_BILLING: 'ออกใบแจ้งหนี้',
  WAIT_PAYMENT: 'รอชำระเงิน',
  INSTALLATION: 'ดำเนินการติดตั้งเปลี่ยนมิเตอร์',
  INSPECTION: 'ตรวจสอบหลังติดตั้ง',
  WAIT_ACTION_CONFIRMATION: 'รอชำระเงิน',
  WAIT_MANAGER_REVIEW: 'รอผู้จัดการตรวจ',
  RETURNED_FOR_RESURVEY: 'ต้องสำรวจใหม่',
  COMPLETED: 'เสร็จสิ้น',
  COMPLETED_OVERLOAD_FORWARD: 'เสร็จสิ้น'
};

export const REQUEST_STATUS_DESCRIPTION: Partial<Record<RequestStatus, string>> = {
  COMPLETED_OVERLOAD_FORWARD: 'ส่งต่อกระบี่เพื่อปรับปรุงระบบแล้ว'
};

export const REQUEST_STATUS_OWNER_LABELS: Partial<Record<RequestStatus, string>> = {
  SURVEY_OVERLOAD_REPORTED: 'ผู้จัดการอ่าวนาง'
};

export const REQUEST_QUEUE_GROUP_LABELS: Record<RequestQueueGroup, string> = {
  SURVEY: 'สำรวจ',
  DISPATCH: 'เอกสาร',
  KRABI: 'ดำเนินการ',
  BILLING: 'การเงิน',
  MANAGER: 'อนุมัติ',
  DONE: 'เสร็จสิ้น',
  OTHER: 'อื่น ๆ'
};

export const DASHBOARD_QUEUE_GROUPS: RequestQueueGroup[] = ['SURVEY', 'BILLING', 'MANAGER', 'DISPATCH', 'KRABI', 'DONE'];

export const REQUEST_QUEUE_GROUP_META: Record<
  RequestQueueGroup,
  { label: string; href: string; order: number; toneClass: string; showOnDashboard: boolean }
> = {
  SURVEY: {
    label: REQUEST_QUEUE_GROUP_LABELS.SURVEY,
    href: '/surveyor',
    order: 1,
    toneClass: 'text-[#3B82F6]',
    showOnDashboard: true
  },
  BILLING: {
    label: REQUEST_QUEUE_GROUP_LABELS.BILLING,
    href: '/billing',
    order: 2,
    toneClass: 'text-[#F59E0B]',
    showOnDashboard: true
  },
  MANAGER: {
    label: REQUEST_QUEUE_GROUP_LABELS.MANAGER,
    href: '/manager',
    order: 3,
    toneClass: 'text-[#6366F1]',
    showOnDashboard: true
  },
  DISPATCH: {
    label: REQUEST_QUEUE_GROUP_LABELS.DISPATCH,
    href: '/document',
    order: 4,
    toneClass: 'text-[#64748B]',
    showOnDashboard: true
  },
  KRABI: {
    label: REQUEST_QUEUE_GROUP_LABELS.KRABI,
    href: '/krabi',
    order: 5,
    toneClass: 'text-[#6366F1]',
    showOnDashboard: true
  },
  DONE: {
    label: REQUEST_QUEUE_GROUP_LABELS.DONE,
    href: '/dashboard?queue=DONE',
    order: 6,
    toneClass: 'text-[#10B981]',
    showOnDashboard: true
  },
  OTHER: {
    label: REQUEST_QUEUE_GROUP_LABELS.OTHER,
    href: '/dashboard',
    order: 7,
    toneClass: 'text-[#64748B]',
    showOnDashboard: false
  }
};

export const REQUEST_STATUS_QUEUE_GROUP: Record<RequestStatus, RequestQueueGroup> = {
  NEW: 'OTHER',
  PENDING_SURVEY_REVIEW: 'SURVEY',
  SURVEY_ACCEPTED: 'SURVEY',
  SURVEY_DOCS_INCOMPLETE: 'SURVEY',
  SURVEY_RESCHEDULE_REQUESTED: 'SURVEY',
  SURVEY_COMPLETED: 'SURVEY',
  WAIT_LAYOUT_DRAWING: 'DISPATCH',
  WAITING_TO_SEND_TO_KRABI: 'DISPATCH',
  SENT_TO_KRABI: 'DISPATCH',
  WAIT_KRABI_DOCUMENT_CHECK: 'DISPATCH',
  KRABI_NEEDS_DOCUMENT_FIX: 'DISPATCH',
  KRABI_IN_PROGRESS: 'KRABI',
  KRABI_ESTIMATION_COMPLETED: 'KRABI',
  BILL_ISSUED: 'KRABI',
  COORDINATED_WITH_CONSTRUCTION: 'DONE',
  WAIT_DOCUMENT_REVIEW: 'SURVEY',
  WAIT_DOCUMENT_FROM_CUSTOMER: 'SURVEY',
  READY_FOR_SURVEY: 'SURVEY',
  IN_SURVEY: 'SURVEY',
  WAIT_CUSTOMER_FIX: 'SURVEY',
  WAIT_FIX_REVIEW: 'SURVEY',
  READY_FOR_RESURVEY: 'SURVEY',
  SURVEY_OVERLOAD_REPORTED: 'MANAGER',
  WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL: 'MANAGER',
  WAIT_KRABI_APPROVAL: 'KRABI',
  KRABI_NEEDS_CORRECTION: 'DISPATCH',
  DOCUMENT_FIX: 'DISPATCH',
  RESENT_TO_KRABI: 'DISPATCH',
  KRABI_APPROVED: 'KRABI',
  WAIT_RECEIVE_FROM_KRABI: 'BILLING',
  WAIT_ELIGIBILITY_REVIEW: 'BILLING',
  WAIT_AONANG_MANAGER_FINAL_APPROVAL: 'MANAGER',
  CHECK_3PHASE_CAPABILITY: 'SURVEY',
  NEEDS_EXPANSION: 'DISPATCH',
  DESIGN_AND_ESTIMATE: 'SURVEY',
  WAIT_BILLING: 'BILLING',
  WAIT_PAYMENT: 'BILLING',
  INSTALLATION: 'SURVEY',
  INSPECTION: 'SURVEY',
  WAIT_ACTION_CONFIRMATION: 'BILLING',
  WAIT_MANAGER_REVIEW: 'MANAGER',
  RETURNED_FOR_RESURVEY: 'SURVEY',
  COMPLETED: 'DONE',
  COMPLETED_OVERLOAD_FORWARD: 'DONE'
};

export function getRequestQueueGroup(status: RequestStatus): RequestQueueGroup {
  return REQUEST_STATUS_QUEUE_GROUP[status];
}

export function getRequestQueueGroupLabel(queue: RequestQueueGroup): string {
  return REQUEST_QUEUE_GROUP_LABELS[queue];
}

export function getDashboardQueueGroups(): RequestQueueGroup[] {
  return DASHBOARD_QUEUE_GROUPS;
}

export function isSurveyPhaseStatus(status: RequestStatus): boolean {
  return getRequestQueueGroup(status) === 'SURVEY';
}

/**
 * @deprecated หลีกเลี่ยงการใช้ค่า assignee_name ตรง ๆ ใน UI layer
 * โดยเฉพาะช่วงงานสำรวจที่ต้องอิง assigned_surveyor เป็นหลัก
 */
export function getResponsiblePersonName(
  request: Pick<ServiceRequest, 'status' | 'assignee_name' | 'assigned_surveyor'>
): string {
  if (isSurveyPhaseStatus(request.status)) {
    return getSurveyorDisplayName(request.assigned_surveyor ?? request.assignee_name);
  }

  return getSurveyorDisplayName(request.assignee_name ?? request.assigned_surveyor);
}

export function getStatusesByQueueGroup(queue: RequestQueueGroup): RequestStatus[] {
  return REQUEST_STATUSES.filter((status) => REQUEST_STATUS_QUEUE_GROUP[status] === queue);
}

export const SURVEYOR_VISIBLE_STATUSES: RequestStatus[] = getStatusesByQueueGroup('SURVEY');
export const BILLING_VISIBLE_STATUSES: RequestStatus[] = getStatusesByQueueGroup('BILLING');
export const MANAGER_VISIBLE_STATUSES: RequestStatus[] = getStatusesByQueueGroup('MANAGER');
export const SURVEY_MAP_ACTIVE_STATUS: RequestStatus = 'IN_SURVEY';
export const SURVEY_MAP_DEFAULT_STATUSES: RequestStatus[] = [SURVEY_MAP_ACTIVE_STATUS];

export function getSurveyMapStatusesFromQuery(_rawStatus: string | null | undefined): RequestStatus[] {
  return SURVEY_MAP_DEFAULT_STATUSES;
}

export function getRequestStatusLabel(status: RequestStatus): string {
  return REQUEST_STATUS_LABELS[status];
}

type OverloadCompletedDisplayRequest = Pick<ServiceRequest, 'status' | 'survey_failure_type'>;
export type DisplayStatus = RequestStatus | 'WAITING_KRABI';
export const WAITING_KRABI_DISPLAY_STATUS: DisplayStatus = 'WAITING_KRABI';
export type DisplayStatusContext = 'AONANG_INTERNAL' | 'CUSTOMER';

export const WAITING_KRABI_DISPLAY_LABELS: Record<DisplayStatusContext, string> = {
  AONANG_INTERNAL: 'เสร็จสิ้น (ส่งต่อกระบี่เพื่อปรับปรุงระบบแล้ว)',
  CUSTOMER: 'รอการปรับปรุงระบบไฟฟ้าจากกระบี่'
};

export function isOverloadCompletedAwaitingKrabi(request: OverloadCompletedDisplayRequest): boolean {
  return request.survey_failure_type === 'OVERLOAD_REPORTED' && ['COMPLETED', 'COMPLETED_OVERLOAD_FORWARD'].includes(request.status);
}

export function resolveDisplayStatus(request: OverloadCompletedDisplayRequest): DisplayStatus {
  if (isOverloadCompletedAwaitingKrabi(request)) {
    return WAITING_KRABI_DISPLAY_STATUS;
  }

  return request.status;
}

export function getDisplayStatusLabel(status: DisplayStatus, context: DisplayStatusContext = 'AONANG_INTERNAL'): string {
  if (status === WAITING_KRABI_DISPLAY_STATUS) {
    return WAITING_KRABI_DISPLAY_LABELS[context];
  }

  return getRequestStatusLabel(status as RequestStatus);
}

export function getRequestStatusLabelForDisplay(
  request: OverloadCompletedDisplayRequest,
  context: DisplayStatusContext = 'AONANG_INTERNAL'
): string {
  return getDisplayStatusLabel(resolveDisplayStatus(request), context);
}

export function isActuallyCompleted(request: OverloadCompletedDisplayRequest): boolean {
  return request.status === 'COMPLETED' && !isOverloadCompletedAwaitingKrabi(request);
}

export function getDispatchSubStatus(
  _request: Pick<ServiceRequest, 'status' | 'is_document_ready' | 'planned_dispatch_date'>
): string | null {
  return null;
}

export function normalizeSurveyWorkflowStatus(status: RequestStatus): RequestStatus {
  if (status === 'PENDING_SURVEY_REVIEW') {
    return 'WAIT_DOCUMENT_REVIEW';
  }
  if (status === 'SURVEY_DOCS_INCOMPLETE') {
    return 'WAIT_DOCUMENT_FROM_CUSTOMER';
  }
  if (status === 'SURVEY_ACCEPTED' || status === 'SURVEY_RESCHEDULE_REQUESTED') {
    return 'READY_FOR_SURVEY';
  }
  return status;
}

export const KRABI_DISPATCH_WEEKDAYS = [3, 5] as const;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function calculateNextPlannedDispatchDate(fromDate: Date = new Date()): string {
  const base = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate()));
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(base.getTime() + offset * DAY_IN_MS);
    if (KRABI_DISPATCH_WEEKDAYS.includes(candidate.getUTCDay() as (typeof KRABI_DISPATCH_WEEKDAYS)[number])) {
      return candidate.toISOString().slice(0, 10);
    }
  }

  return base.toISOString().slice(0, 10);
}

function getAgeInDays(since: string | null | undefined, now: Date = new Date()): number | null {
  if (!since) {
    return null;
  }

  const sinceDate = new Date(since);
  if (Number.isNaN(sinceDate.valueOf())) {
    return null;
  }

  return Math.floor((now.getTime() - sinceDate.getTime()) / DAY_IN_MS);
}

export function getKrabiDispatchWarning(
  request: Pick<ServiceRequest, 'status'> &
    Partial<Pick<ServiceRequest, 'document_prepared_at' | 'planned_dispatch_date' | 'is_document_ready'>>
): string | null {
  if (request.status === 'WAITING_TO_SEND_TO_KRABI') {
    if (request.is_document_ready) {
      if (request.planned_dispatch_date && request.planned_dispatch_date < new Date().toISOString().slice(0, 10)) {
        return `เลยรอบส่ง ${request.planned_dispatch_date}`;
      }

      const ageInDays = getAgeInDays(request.document_prepared_at);
      if (ageInDays !== null && ageInDays >= 3) {
        return `ค้างคิวส่งกระบี่ ${ageInDays} วัน`;
      }
    } else {
      const ageInDays = getAgeInDays(request.document_prepared_at);
      if (ageInDays !== null && ageInDays >= 2) {
        return `ค้างขั้นเตรียมส่งกระบี่ ${ageInDays} วัน`;
      }
    }
  }

  return null;
}

export function getDocumentReviewMode(requestType: RequestType): DocumentReviewMode {
  return requestType === 'EXPANSION' ? 'DETAILED' : 'BASIC';
}


export const METER_30_100_REQUEST_TYPES: RequestType[] = ['METER_30_100_1P', 'METER_30_100_3P'];

export function isThirtyOneHundredRequestType(requestType: RequestType): boolean {
  return METER_30_100_REQUEST_TYPES.includes(requestType);
}

export function isThreePhaseRequestType(requestType: RequestType): boolean {
  return requestType === 'METER_TO_3PHASE' || requestType === 'METER_30_100_3P';
}

export function isMeterFamilyRequestType(requestType: RequestType): boolean {
  return requestType === 'METER' || requestType === 'METER_30_100_1P' || requestType === 'METER_30_100_3P' || requestType === 'METER_TO_3PHASE';
}

export const METER_LIKE_BILLING_STATUSES: ReadonlyArray<RequestStatus> = [
  'WAIT_BILLING',
  'WAIT_PAYMENT',
  'WAIT_ACTION_CONFIRMATION',
  'WAIT_AONANG_MANAGER_FINAL_APPROVAL',
  'WAIT_MANAGER_REVIEW'
];

export function isMeterLikeBillingRequest(requestType: RequestType, status: RequestStatus): boolean {
  if (!METER_LIKE_BILLING_STATUSES.includes(status)) {
    return false;
  }

  if ((requestType === 'METER_TO_3PHASE' || requestType === 'METER_30_100_3P') && status === 'WAIT_PAYMENT') {
    return false;
  }

  return requestType === 'METER' || requestType === 'METER_30_100_1P' || requestType === 'METER_30_100_3P' || requestType === 'METER_TO_3PHASE';
}

export const EXPANSION_WORKFLOW_STATUSES: RequestStatus[] = [
  'WAIT_LAYOUT_DRAWING',
  'WAITING_TO_SEND_TO_KRABI',
  'SENT_TO_KRABI',
  'WAIT_KRABI_DOCUMENT_CHECK',
  'KRABI_NEEDS_DOCUMENT_FIX',
  'KRABI_IN_PROGRESS',
  'KRABI_ESTIMATION_COMPLETED',
  'BILL_ISSUED',
  'COORDINATED_WITH_CONSTRUCTION'
];

export function isExpansionWorkflowStatus(status: RequestStatus): boolean {
  return EXPANSION_WORKFLOW_STATUSES.includes(status);
}

export function getFlowType(
  request: Pick<ServiceRequest, 'request_type' | 'status'> & Partial<Pick<ServiceRequest, 'flow_type' | 'three_phase_capability_result'>>
): FlowType {
  if (request.flow_type) {
    return request.flow_type;
  }

  if (request.request_type === 'EXPANSION') {
    return 'EXPANSION';
  }

  if (request.three_phase_capability_result === 'UNSUPPORTED') {
    return 'EXPANSION';
  }

  if (request.status === 'NEEDS_EXPANSION' || isExpansionWorkflowStatus(request.status)) {
    return 'EXPANSION';
  }

  return 'METER';
}

export function getFlowTypeLabel(flowType: FlowType): string {
  return FLOW_TYPE_LABELS[flowType];
}

export function shouldUseExpansionActionSet(
  request: Pick<ServiceRequest, 'request_type' | 'status'> &
    Partial<Pick<ServiceRequest, 'flow_type' | 'three_phase_capability_result'>>
): boolean {
  if (request.request_type === 'EXPANSION') {
    return true;
  }

  if (!['METER_TO_3PHASE', 'METER_30_100_3P'].includes(request.request_type)) {
    return false;
  }

  return getFlowType(request) === 'EXPANSION';
}

export function getRequiredDocuments(requestType: RequestType): string[] {
  if (requestType === 'EXPANSION') {
    return ['เอกสารคำขอขยายเขต', 'เอกสารยืนยันสิทธิ์ผู้ยื่น', 'ตำแหน่งหน้างาน'];
  }
  return ['เอกสารคำขอขอมิเตอร์', 'เอกสารยืนยันสิทธิ์ผู้ยื่น'];
}

export function getDocumentReviewRules(requestType: RequestType): {
  mode: DocumentReviewMode;
  requiredDocuments: string[];
} {
  return {
    mode: getDocumentReviewMode(requestType),
    requiredDocuments: getRequiredDocuments(requestType)
  };
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
  return request.scheduled_survey_date;
}

export const SURVEYOR_PRIMARY_STATUS_MAP: Record<'WAITING_REVIEW' | 'READY' | 'IN_PROGRESS' | 'DONE', RequestStatus[]> = {
  WAITING_REVIEW: ['WAIT_DOCUMENT_REVIEW', 'PENDING_SURVEY_REVIEW'],
  READY: ['READY_FOR_SURVEY', 'SURVEY_ACCEPTED', 'SURVEY_RESCHEDULE_REQUESTED'],
  IN_PROGRESS: ['IN_SURVEY'],
  DONE: ['SURVEY_COMPLETED', 'SURVEY_OVERLOAD_REPORTED']
};

function parseDateOnlyFromIsoLike(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const directDateOnlyMatch = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  if (directDateOnlyMatch?.[1]) {
    return directDateOnlyMatch[1];
  }

  const parsedDate = new Date(trimmed);
  if (Number.isNaN(parsedDate.valueOf())) {
    return null;
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(parsedDate);
}

function getTodayDateOnlyInBangkok(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
}

export function isSurveyScheduledTodayInBangkok(
  request: Pick<ServiceRequest, 'scheduled_survey_date' | 'survey_date_current'>,
  now: Date = new Date()
): boolean {
  const scheduledDate = getCurrentSurveyDate(request);
  if (!scheduledDate) {
    return false;
  }

  const dateOnly = parseDateOnlyFromIsoLike(scheduledDate);
  if (!dateOnly) {
    return false;
  }

  return dateOnly === getTodayDateOnlyInBangkok(now);
}

export function formatThaiSurveyDate(value: string | null): string {
  if (!value) {
    return '-';
  }

  const dateOnly = parseDateOnlyFromIsoLike(value);
  if (!dateOnly) {
    return '-';
  }

  return formatDateOnly(dateOnly);
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
      ? `รอเอกสารจากผู้ใช้ไฟตั้งแต่ ${formatThaiDateTime(request.awaiting_customer_documents_since)}`
      : 'รอเอกสารจากผู้ใช้ไฟ';
  }

  if (request.documents_received_at) {
    return `ได้รับเอกสารจากผู้ใช้ไฟแล้วเมื่อ ${formatThaiDateTime(request.documents_received_at)}`;
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
  return ['METER', 'METER_30_100_1P', 'METER_30_100_3P', 'METER_TO_3PHASE'].includes(request.request_type) && request.status === 'IN_SURVEY';
}

export function canEvaluateThreePhaseCapability(
  request: Pick<ServiceRequest, 'status' | 'request_type' | 'three_phase_capability_result'>
): boolean {
  return ['METER_TO_3PHASE', 'METER_30_100_3P'].includes(request.request_type) && request.status === 'IN_SURVEY' && request.three_phase_capability_result !== 'SUPPORTED';
}

export function canMarkSurveyFailed(request: Pick<ServiceRequest, 'status' | 'request_type'>): boolean {
  return ['METER', 'METER_30_100_1P', 'METER_30_100_3P', 'METER_TO_3PHASE'].includes(request.request_type) && request.status === 'IN_SURVEY';
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
    customerFixReportedAt: request.customer_fix_reported_at ? formatThaiDateTime(request.customer_fix_reported_at) : '-',
    photoReviewedBy: request.photo_reviewed_by ?? '-',
    photoReviewedAt: request.photo_reviewed_at ? formatThaiDateTime(request.photo_reviewed_at) : '-'
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
  house_number: string | null;
  village_no: string | null;
  road: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  location_note: string | null;
  area_name: string;
  assignee_name: string;
  assigned_surveyor_id: string | null;
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
  request_intent: 'NEW_METER' | 'UPSCALE' | 'RELOCATE' | 'PHASE_UPGRADE' | 'EXPANSION' | null;
  meter_size: 'NORMAL' | 'THIRTY_ONE_HUNDRED' | null;
  phase: 'ONE_PHASE' | 'THREE_PHASE' | null;
  flow_type?: FlowType | null;
  survey_note: string | null;
  survey_reschedule_date: string | null;
  survey_reviewed_at: string | null;
  survey_completed_at: string | null;
  survey_result: SurveyResult | null;
  survey_failure_type: SurveyFailureType | null;
  fix_verification_mode: FixVerificationMode | null;
  customer_fix_note: string | null;
  overload_report_reason: string | null;
  overload_report_note: string | null;
  overload_reported_at: string | null;
  overload_reported_by: string | null;
  manager_overload_approved_at: string | null;
  manager_overload_approved_by: string | null;
  krabi_reference_no: string | null;
  krabi_submitted_at: string | null;
  krabi_submitted_by: string | null;
  manager_return_reason: string | null;
  manager_return_checklist: string[] | null;
  manager_returned_by: string | null;
  manager_returned_at: string | null;
  survey_round: number | null;
  resurvey_note: string | null;
  resurvey_completed_at: string | null;
  customer_fix_reported_at: string | null;
  photo_review_status: PhotoReviewStatus | null;
  photo_reviewed_at: string | null;
  photo_reviewed_by: string | null;
  fix_approved_via: FixApprovalSource | null;
  document_status: DocumentStatus | null;
  collect_docs_on_site: boolean;
  incomplete_docs_note: string | null;
  reject_reason: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  billing_amount: number | null;
  billing_note: string | null;
  billed_at: string | null;
  billed_by: string | null;
  invoice_signed_at: string | null;
  invoice_signed_by: string | null;
  paid_at: string | null;
  paid_by: string | null;
  is_document_ready: boolean;
  document_prepared_at: string | null;
  planned_dispatch_date: string | null;
  dispatched_to_krabi_at: string | null;
  dispatched_to_krabi_by: string | null;
  krabi_received_at: string | null;
  krabi_in_progress_at: string | null;
  krabi_completed_at: string | null;
  forwarded_to_expansion_at: string | null;
  forwarded_to_expansion_note: string | null;
  three_phase_capability_result: ThreePhaseCapabilityResult | null;
  three_phase_capability_checked_at: string | null;
  created_at: string;
  updated_at: string;
};
