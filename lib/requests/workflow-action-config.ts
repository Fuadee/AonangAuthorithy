import {
  canApproveFixFromPhoto,
  canEvaluateThreePhaseCapability,
  canMarkSurveyPassed,
  canMoveToManagerReview,
  canStartSurvey,
  RequestStatus,
  RequestType,
  ServiceRequest,
  shouldUseExpansionActionSet
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
  | 'THREE_PHASE_CAPABLE'
  | 'THREE_PHASE_NEEDS_EXPANSION'
  | 'REPORT_CUSTOMER_FIX'
  | 'SCHEDULE_RESURVEY'
  | 'PHOTO_APPROVE'
  | 'PHOTO_REJECT_TO_RESURVEY'
  | 'ISSUE_BILL'
  | 'SURVEYOR_SIGN'
  | 'CONFIRM_PAYMENT'
  | 'MANAGER_APPROVE'
  | 'LAYOUT_DRAWING_DONE'
  | 'DISPATCHED_TO_KRABI'
  | 'KRABI_ACCEPT_AND_START'
  | 'KRABI_RETURN_FOR_FIX'
  | 'KRABI_FIX_COMPLETED'
  | 'KRABI_ESTIMATION_COMPLETED'
  | 'KRABI_BILL_ISSUED'
  | 'COORDINATED_WITH_CONSTRUCTION'
  | 'COMPLETE_DESIGN_ESTIMATE'
  | 'ISSUE_3PHASE_BILL'
  | 'CONFIRM_3PHASE_PAYMENT'
  | 'COMPLETE_INSTALLATION'
  | 'COMPLETE_INSPECTION';

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
  THREE_PHASE_CAPABLE: 'ระบบรองรับ 3 เฟส',
  THREE_PHASE_NEEDS_EXPANSION: 'ระบบไม่รองรับ 3 เฟส (ส่งต่องานขยายเขต)',
  REPORT_CUSTOMER_FIX: 'ผู้ใช้ไฟแจ้งว่าแก้ไขแล้ว',
  SCHEDULE_RESURVEY: 'นัดตรวจซ้ำ',
  PHOTO_APPROVE: 'อนุมัติผ่านจากรูป',
  PHOTO_REJECT_TO_RESURVEY: 'รูปยังไม่พอ ต้องตรวจซ้ำ',
  ISSUE_BILL: 'ออกใบแจ้งหนี้',
  SURVEYOR_SIGN: 'เซ็นใบแจ้งหนี้แล้ว',
  CONFIRM_PAYMENT: 'ชำระเงินแล้ว',
  MANAGER_APPROVE: 'อนุมัติแล้ว',
  LAYOUT_DRAWING_DONE: 'วาดผังเสร็จ',
  DISPATCHED_TO_KRABI: 'ส่งให้กระบี่',
  KRABI_ACCEPT_AND_START: 'ยืนยันรับเอกสาร',
  KRABI_RETURN_FOR_FIX: 'เอกสารไม่พร้อม ส่งกลับแก้ไข',
  KRABI_FIX_COMPLETED: 'แก้ไขเอกสารแล้ว / พร้อมส่งใหม่',
  KRABI_ESTIMATION_COMPLETED: 'ประมาณการเสร็จ',
  KRABI_BILL_ISSUED: 'ออกใบแจ้งหนี้แล้ว',
  COORDINATED_WITH_CONSTRUCTION: 'ผกส.รับเรื่องแล้ว',
  COMPLETE_DESIGN_ESTIMATE: 'ออกแบบ / ประเมินเสร็จ',
  ISSUE_3PHASE_BILL: 'ออกใบแจ้งหนี้ 3 เฟส',
  CONFIRM_3PHASE_PAYMENT: 'ยืนยันชำระเงิน 3 เฟส',
  COMPLETE_INSTALLATION: 'ติดตั้งเปลี่ยนมิเตอร์เสร็จ',
  COMPLETE_INSPECTION: 'ตรวจสอบหลังติดตั้งผ่าน'
};

export function getWorkflowActionLabel(actionKey: WorkflowActionKey): string {
  return WORKFLOW_ACTION_LABELS[actionKey];
}

const STATUS_INSTRUCTION: Partial<Record<RequestStatus, string>> = {
  WAIT_DOCUMENT_REVIEW: 'กรุณาเลือกผลการตรวจเอกสาร',
  WAIT_DOCUMENT_FROM_CUSTOMER: 'กรุณายืนยันว่าได้รับเอกสารจากลูกค้าแล้ว',
  READY_FOR_SURVEY: 'กรุณารับงานสำรวจ',
  IN_SURVEY: 'กรุณาดำเนินการหลังสำรวจ',
  CHECK_3PHASE_CAPABILITY: 'กรุณาเลือกผลว่าระบบรองรับ 3 เฟสหรือไม่',
  DESIGN_AND_ESTIMATE: 'กรุณาบันทึกผลการออกแบบ/ประเมิน',
  WAIT_PAYMENT: 'กรุณายืนยันการรับชำระเงิน',
  INSTALLATION: 'กรุณาบันทึกผลการติดตั้งเปลี่ยนมิเตอร์',
  INSPECTION: 'กรุณาบันทึกผลตรวจสอบหลังติดตั้ง',
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

function dedupeWorkflowActions(actions: AvailableRequestAction[]): AvailableRequestAction[] {
  return Array.from(new Map(actions.map((action) => [action.key, action])).values());
}

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
    | 'status'
    | 'request_type'
    | 'fix_verification_mode'
    | 'scheduled_survey_date'
    | 'survey_date_current'
    | 'invoice_signed_at'
    | 'paid_at'
    | 'is_document_ready'
  > & { three_phase_capability_result?: ServiceRequest['three_phase_capability_result'] }
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
    if (request.request_type === 'METER_TO_3PHASE') {
      console.info('[meter-3phase-supported-render-resolve]', {
        status,
        requestType: request.request_type,
        capabilityResult: request.three_phase_capability_result ?? null
      });
    }

    if (
      request.request_type === 'METER_TO_3PHASE' &&
      canEvaluateThreePhaseCapability({
        status,
        request_type: request.request_type,
        three_phase_capability_result: request.three_phase_capability_result ?? null
      })
    ) {
      return [
        toAction('THREE_PHASE_CAPABLE', { variant: 'primary', requiresConfirmation: 'ยืนยันว่าระบบรองรับ 3 เฟส?' }),
        toAction('THREE_PHASE_NEEDS_EXPANSION', { variant: 'secondary', intent: 'warning', requiresConfirmation: 'ยืนยันส่งต่องานเดิมเข้าสู่ flow ขยายเขตที่ WAIT_LAYOUT_DRAWING?' })
      ];
    }

    if (canMarkSurveyPassed({ status, request_type: request.request_type })) {
      return [
        toAction('SURVEY_PASS', { variant: 'primary', requiresConfirmation: 'ยืนยันผลสำรวจผ่าน?' }),
        toAction('SURVEY_FAIL', { variant: 'secondary', intent: 'warning', handlerType: 'survey_fail_dialog' })
      ];
    }

    return [toAction('COMPLETE_SURVEY', { variant: 'primary', requiresConfirmation: 'ยืนยันว่าการสำรวจเสร็จสิ้นแล้ว?' })];
  }

  if (request.request_type === 'METER_TO_3PHASE' && status === 'CHECK_3PHASE_CAPABILITY') {
    return [
      toAction('THREE_PHASE_CAPABLE', { variant: 'primary', requiresConfirmation: 'ยืนยันว่าระบบรองรับ 3 เฟส?' }),
      toAction('THREE_PHASE_NEEDS_EXPANSION', { variant: 'secondary', intent: 'warning', requiresConfirmation: 'ยืนยันส่งต่องานเดิมเข้าสู่ flow ขยายเขตที่ WAIT_LAYOUT_DRAWING?' })
    ];
  }

  if (status === 'WAIT_CUSTOMER_FIX' && ['METER', 'METER_TO_3PHASE'].includes(request.request_type)) {
    return [
      toAction('REPORT_CUSTOMER_FIX', { variant: 'primary', requiresConfirmation: 'ยืนยันว่าลูกค้าแจ้งแก้ไขแล้ว?' }),
      toAction('SCHEDULE_RESURVEY', { variant: 'secondary', requiresConfirmation: 'นัดตรวจซ้ำทันทีใช่หรือไม่?' })
    ];
  }

  if (status === 'WAIT_FIX_REVIEW' && ['METER', 'METER_TO_3PHASE'].includes(request.request_type)) {
    return [toAction('PHOTO_APPROVE', { variant: 'primary' }), toAction('PHOTO_REJECT_TO_RESURVEY', { variant: 'secondary' })].filter(
      (action) => action.key !== 'PHOTO_APPROVE' || canApproveFixFromPhoto({ status, fix_verification_mode: request.fix_verification_mode })
    );
  }

  if (status === 'WAIT_MANAGER_REVIEW' && ['METER', 'METER_TO_3PHASE'].includes(request.request_type) && canMoveToManagerReview(request)) {
    return [toAction('MANAGER_APPROVE', { variant: 'primary', requiresConfirmation: 'ยืนยันอนุมัติปิดงาน?' })];
  }

  if (shouldUseExpansionActionSet(request) && ['SURVEY_COMPLETED', 'WAIT_LAYOUT_DRAWING'].includes(status)) {
    return [toAction('LAYOUT_DRAWING_DONE', { variant: 'primary', requiresConfirmation: 'ยืนยันวาดผังเสร็จแล้ว?' })];
  }

  if (shouldUseExpansionActionSet(request) && status === 'WAITING_TO_SEND_TO_KRABI') {
    return [toAction('DISPATCHED_TO_KRABI', { variant: 'primary' })];
  }

  if (shouldUseExpansionActionSet(request) && ['SENT_TO_KRABI', 'WAIT_KRABI_DOCUMENT_CHECK'].includes(status)) {
    return [
      toAction('KRABI_ACCEPT_AND_START', { variant: 'primary' }),
      toAction('KRABI_RETURN_FOR_FIX', { variant: 'secondary', intent: 'warning' })
    ];
  }

  if (shouldUseExpansionActionSet(request) && status === 'KRABI_NEEDS_DOCUMENT_FIX') {
    return [toAction('KRABI_FIX_COMPLETED', { variant: 'primary' })];
  }

  if (shouldUseExpansionActionSet(request) && status === 'KRABI_IN_PROGRESS') {
    return [toAction('KRABI_ESTIMATION_COMPLETED', { variant: 'primary' })];
  }

  if (shouldUseExpansionActionSet(request) && status === 'KRABI_ESTIMATION_COMPLETED') {
    return [toAction('KRABI_BILL_ISSUED', { variant: 'primary' })];
  }

  if (shouldUseExpansionActionSet(request) && status === 'BILL_ISSUED') {
    return [toAction('COORDINATED_WITH_CONSTRUCTION', { variant: 'primary' })];
  }

  return [];
}

export function getQueueWorkflowActions(
  request: Pick<
    ServiceRequest,
    | 'status'
    | 'request_type'
    | 'fix_verification_mode'
    | 'scheduled_survey_date'
    | 'survey_date_current'
    | 'invoice_signed_at'
    | 'paid_at'
    | 'is_document_ready'
  > & { three_phase_capability_result?: ServiceRequest['three_phase_capability_result'] }
): QueueWorkflowAction[] {
  return dedupeWorkflowActions(getAvailableRequestActions(request));
}

export function getWorkflowActionsForRequest(
  request: Pick<
    ServiceRequest,
    | 'status'
    | 'request_type'
    | 'fix_verification_mode'
    | 'scheduled_survey_date'
    | 'survey_date_current'
    | 'invoice_signed_at'
    | 'paid_at'
    | 'is_document_ready'
  > & { three_phase_capability_result?: ServiceRequest['three_phase_capability_result'] }
): AvailableRequestAction[] {
  return dedupeWorkflowActions(getAvailableRequestActions(request));
}
