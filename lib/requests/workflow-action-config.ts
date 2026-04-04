import {
  canApproveFixFromPhoto,
  canMarkSurveyPassed,
  canMoveToManagerReview,
  canStartSurvey,
  RequestStatus,
  RequestType,
  ServiceRequest
} from '@/lib/requests/types';

export type WorkflowActionKey =
  | 'DOC_COMPLETE'
  | 'DOC_INCOMPLETE_COLLECT_ON_SITE'
  | 'DOC_INCOMPLETE_WAIT_CUSTOMER'
  | 'CONFIRM_DOCS_RECEIVED'
  | 'START_SURVEY'
  | 'SCHEDULE_SURVEY'
  | 'EDIT_SURVEY_DATE'
  | 'COMPLETE_SURVEY'
  | 'SURVEY_PASS'
  | 'SURVEY_FAIL'
  | 'REPORT_CUSTOMER_FIX'
  | 'SCHEDULE_RESURVEY'
  | 'PHOTO_APPROVE'
  | 'PHOTO_REJECT_TO_RESURVEY'
  | 'ISSUE_BILL'
  | 'SURVEYOR_SIGN'
  | 'CONFIRM_PAYMENT'
  | 'MANAGER_APPROVE'
  | 'LAYOUT_DRAWING_DONE'
  | 'QUEUE_KRABI_DISPATCH'
  | 'DISPATCHED_TO_KRABI'
  | 'KRABI_ACCEPT_AND_START'
  | 'KRABI_RETURN_FOR_FIX'
  | 'KRABI_FIX_COMPLETED'
  | 'KRABI_ESTIMATION_COMPLETED'
  | 'KRABI_BILL_ISSUED'
  | 'COORDINATED_WITH_CONSTRUCTION';

export type WorkflowActionVariant = 'primary' | 'secondary';
export type WorkflowActionIntent = 'progress' | 'warning' | 'neutral';
export type WorkflowActionHandlerType = 'modal' | 'schedule_dialog' | 'survey_fail_dialog';

export const WORKFLOW_ACTION_LABELS: Record<WorkflowActionKey, string> = {
  DOC_COMPLETE: 'เอกสารครบ',
  DOC_INCOMPLETE_COLLECT_ON_SITE: 'เอกสารไม่ครบ (รับเอกสารหน้างาน)',
  DOC_INCOMPLETE_WAIT_CUSTOMER: 'เอกสารไม่ครบ (รอลูกค้านำมา)',
  CONFIRM_DOCS_RECEIVED: 'ได้รับเอกสารแล้ว',
  START_SURVEY: 'รับงาน / ไปสำรวจ',
  SCHEDULE_SURVEY: 'กำหนดวันสำรวจ',
  EDIT_SURVEY_DATE: 'แก้ไขวันนัด',
  COMPLETE_SURVEY: 'สำรวจเสร็จ',
  SURVEY_PASS: 'สำรวจผ่าน',
  SURVEY_FAIL: 'สำรวจไม่ผ่าน / ให้ผู้ใช้ไฟแก้ไข',
  REPORT_CUSTOMER_FIX: 'ผู้ใช้ไฟแจ้งว่าแก้ไขแล้ว',
  SCHEDULE_RESURVEY: 'นัดตรวจซ้ำ',
  PHOTO_APPROVE: 'อนุมัติผ่านจากรูป',
  PHOTO_REJECT_TO_RESURVEY: 'รูปยังไม่พอ ต้องตรวจซ้ำ',
  ISSUE_BILL: 'ออกใบแจ้งหนี้',
  SURVEYOR_SIGN: 'เซ็นใบแจ้งหนี้แล้ว',
  CONFIRM_PAYMENT: 'ชำระเงินแล้ว',
  MANAGER_APPROVE: 'อนุมัติแล้ว',
  LAYOUT_DRAWING_DONE: 'วาดผังเสร็จ',
  QUEUE_KRABI_DISPATCH: 'เตรียมส่งเอกสาร',
  DISPATCHED_TO_KRABI: 'ส่งเอกสารไปกระบี่',
  KRABI_ACCEPT_AND_START: 'ยืนยันรับเอกสาร',
  KRABI_RETURN_FOR_FIX: 'เอกสารไม่พร้อม ส่งกลับแก้ไข',
  KRABI_FIX_COMPLETED: 'แก้ไขเอกสารแล้ว / พร้อมส่งใหม่',
  KRABI_ESTIMATION_COMPLETED: 'ประมาณการเสร็จ',
  KRABI_BILL_ISSUED: 'ออกใบแจ้งหนี้แล้ว',
  COORDINATED_WITH_CONSTRUCTION: 'ประสานงานแผนกก่อสร้างแล้ว'
};

export function getWorkflowActionLabel(actionKey: WorkflowActionKey): string {
  return WORKFLOW_ACTION_LABELS[actionKey];
}

const STATUS_INSTRUCTION: Partial<Record<RequestStatus, string>> = {
  WAIT_DOCUMENT_REVIEW: 'กรุณาเลือกผลการตรวจเอกสาร',
  WAIT_DOCUMENT_FROM_CUSTOMER: 'กรุณายืนยันว่าได้รับเอกสารจากลูกค้าแล้ว',
  READY_FOR_SURVEY: 'กรุณารับงานสำรวจ',
  IN_SURVEY: 'กรุณาดำเนินการหลังสำรวจ',
  WAIT_CUSTOMER_FIX: 'กรุณายืนยันการแจ้งแก้ไขของผู้ใช้ไฟ',
  WAIT_FIX_REVIEW: 'กรุณาเลือกผลการตรวจจากรูป',
  READY_FOR_RESURVEY: 'กรุณารับงานตรวจซ้ำ',
  WAIT_MANAGER_REVIEW: 'กรุณาตรวจสอบและอนุมัติปิดงาน'
};

export function getWorkflowInstruction(status: RequestStatus): string {
  return STATUS_INSTRUCTION[status] ?? 'กรุณาดำเนินการตาม workflow';
}

export type AvailableRequestAction = {
  key: WorkflowActionKey;
  label: string;
  variant: WorkflowActionVariant;
  intent: WorkflowActionIntent;
  handlerType: WorkflowActionHandlerType;
  requiresConfirmation?: string;
};

export type QueueWorkflowAction = AvailableRequestAction;

function toAction(
  key: WorkflowActionKey,
  options: {
    variant: WorkflowActionVariant;
    intent?: WorkflowActionIntent;
    handlerType?: WorkflowActionHandlerType;
    requiresConfirmation?: string;
  }
): AvailableRequestAction {
  return {
    key,
    label: getWorkflowActionLabel(key),
    variant: options.variant,
    intent: options.intent ?? (options.variant === 'primary' ? 'progress' : 'neutral'),
    handlerType:
      options.handlerType ??
      (key === 'SURVEY_FAIL' ? 'survey_fail_dialog' : key === 'SCHEDULE_SURVEY' || key === 'EDIT_SURVEY_DATE' ? 'schedule_dialog' : 'modal'),
    requiresConfirmation: options.requiresConfirmation
  };
}

export function getAvailableRequestActions(
  request: Pick<
    ServiceRequest,
    'status' | 'request_type' | 'fix_verification_mode' | 'scheduled_survey_date' | 'survey_date_current' | 'invoice_signed_at' | 'paid_at'
  >
): AvailableRequestAction[] {
  const status = request.status;

  if (status === 'WAIT_DOCUMENT_REVIEW') {
    return [
      toAction('DOC_COMPLETE', { variant: 'primary', requiresConfirmation: 'ยืนยันว่าเอกสารครบถ้วนแล้วใช่หรือไม่?' }),
      toAction('DOC_INCOMPLETE_COLLECT_ON_SITE', { variant: 'secondary' }),
      toAction('DOC_INCOMPLETE_WAIT_CUSTOMER', { variant: 'secondary' })
    ];
  }

  if (status === 'WAIT_DOCUMENT_FROM_CUSTOMER') {
    return [toAction('CONFIRM_DOCS_RECEIVED', { variant: 'primary', requiresConfirmation: 'ยืนยันว่าได้รับเอกสารจากลูกค้าแล้ว?' })];
  }

  if (status === 'READY_FOR_SURVEY') {
    if (!request.survey_date_current && !request.scheduled_survey_date) {
      return [toAction('SCHEDULE_SURVEY', { variant: 'primary' })];
    }

    if (!canStartSurvey({ status, scheduled_survey_date: request.scheduled_survey_date, survey_date_current: request.survey_date_current })) {
      return [];
    }

    return [
      toAction('START_SURVEY', { variant: 'primary', requiresConfirmation: 'ยืนยันเริ่มสำรวจหน้างาน?' }),
      toAction('EDIT_SURVEY_DATE', { variant: 'secondary' })
    ];
  }

  if (status === 'READY_FOR_RESURVEY') {
    return [
      toAction('START_SURVEY', { variant: 'primary', requiresConfirmation: 'ยืนยันเริ่มตรวจซ้ำหน้างาน?' }),
      toAction('EDIT_SURVEY_DATE', { variant: 'secondary' })
    ];
  }

  if (status === 'IN_SURVEY') {
    if (request.request_type === 'METER' && canMarkSurveyPassed({ status, request_type: request.request_type })) {
      return [
        toAction('SURVEY_PASS', { variant: 'primary', requiresConfirmation: 'ยืนยันผลสำรวจผ่าน?' }),
        toAction('SURVEY_FAIL', { variant: 'secondary', intent: 'warning', handlerType: 'survey_fail_dialog' })
      ];
    }

    return [toAction('COMPLETE_SURVEY', { variant: 'primary', requiresConfirmation: 'ยืนยันว่าการสำรวจเสร็จสิ้นแล้ว?' })];
  }

  if (status === 'WAIT_CUSTOMER_FIX' && request.request_type === 'METER') {
    return [
      toAction('REPORT_CUSTOMER_FIX', { variant: 'primary', requiresConfirmation: 'ยืนยันว่าลูกค้าแจ้งแก้ไขแล้ว?' }),
      toAction('SCHEDULE_RESURVEY', { variant: 'secondary', requiresConfirmation: 'นัดตรวจซ้ำทันทีใช่หรือไม่?' })
    ];
  }

  if (status === 'WAIT_FIX_REVIEW' && request.request_type === 'METER') {
    return [toAction('PHOTO_APPROVE', { variant: 'primary' }), toAction('PHOTO_REJECT_TO_RESURVEY', { variant: 'secondary' })].filter(
      (action) => action.key !== 'PHOTO_APPROVE' || canApproveFixFromPhoto({ status, fix_verification_mode: request.fix_verification_mode })
    );
  }

  if (status === 'WAIT_MANAGER_REVIEW' && request.request_type === 'METER' && canMoveToManagerReview(request)) {
    return [toAction('MANAGER_APPROVE', { variant: 'primary', requiresConfirmation: 'ยืนยันอนุมัติปิดงาน?' })];
  }

  if (request.request_type === 'EXPANSION' && ['SURVEY_COMPLETED', 'WAIT_LAYOUT_DRAWING'].includes(status)) {
    return [toAction('LAYOUT_DRAWING_DONE', { variant: 'primary', requiresConfirmation: 'ยืนยันวาดผังเสร็จแล้ว?' })];
  }

  if (request.request_type === 'EXPANSION' && status === 'READY_TO_SEND_KRABI') {
    return [toAction('QUEUE_KRABI_DISPATCH', { variant: 'primary', requiresConfirmation: 'ยืนยันเข้าคิวส่งเอกสารไปกระบี่?' })];
  }

  if (request.request_type === 'EXPANSION' && status === 'QUEUED_FOR_KRABI_DISPATCH') {
    return [toAction('DISPATCHED_TO_KRABI', { variant: 'primary' })];
  }

  if (request.request_type === 'EXPANSION' && ['SENT_TO_KRABI', 'WAIT_KRABI_DOCUMENT_CHECK'].includes(status)) {
    return [
      toAction('KRABI_ACCEPT_AND_START', { variant: 'primary' }),
      toAction('KRABI_RETURN_FOR_FIX', { variant: 'secondary', intent: 'warning' })
    ];
  }

  if (request.request_type === 'EXPANSION' && status === 'KRABI_NEEDS_DOCUMENT_FIX') {
    return [toAction('KRABI_FIX_COMPLETED', { variant: 'primary' })];
  }

  if (request.request_type === 'EXPANSION' && status === 'KRABI_IN_PROGRESS') {
    return [toAction('KRABI_ESTIMATION_COMPLETED', { variant: 'primary' })];
  }

  if (request.request_type === 'EXPANSION' && status === 'KRABI_ESTIMATION_COMPLETED') {
    return [toAction('KRABI_BILL_ISSUED', { variant: 'primary' })];
  }

  if (request.request_type === 'EXPANSION' && status === 'BILL_ISSUED') {
    return [toAction('COORDINATED_WITH_CONSTRUCTION', { variant: 'primary' })];
  }

  return [];
}

export function getQueueWorkflowActions(
  request: Pick<
    ServiceRequest,
    'status' | 'request_type' | 'fix_verification_mode' | 'scheduled_survey_date' | 'survey_date_current' | 'invoice_signed_at' | 'paid_at'
  >
): QueueWorkflowAction[] {
  return getAvailableRequestActions(request);
}

export function getWorkflowActionsForRequest(
  request: Pick<
    ServiceRequest,
    'status' | 'request_type' | 'fix_verification_mode' | 'scheduled_survey_date' | 'survey_date_current' | 'invoice_signed_at' | 'paid_at'
  >
): AvailableRequestAction[] {
  return getAvailableRequestActions(request);
}
