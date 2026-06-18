import {
  canApproveFixFromPhoto,
  canEvaluateThreePhaseCapability,
  canMarkSurveyPassed,
  canMoveToManagerReview,
  canStartSurvey,
  isThirtyOneHundredRequestType,
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
  | 'SURVEY_NEEDS_EXPANSION'
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
  | 'MANAGER_RETURN_FOR_RESURVEY'
  | 'RESTART_RETURNED_RESURVEY'
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
  | 'COMPLETE_INSPECTION'
  | 'SEND_PRE_KRABI_APPROVAL'
  | 'APPROVE_PRE_KRABI'
  | 'MOVE_TO_WAIT_KRABI_APPROVAL'
  | 'MARK_KRABI_APPROVED'
  | 'MARK_KRABI_REJECTED'
  | 'START_DOCUMENT_FIX'
  | 'RESENT_TO_KRABI'
  | 'RECEIVE_FROM_KRABI'
  | 'SEND_TO_ELIGIBILITY_REVIEW'
  | 'ELIGIBILITY_PASS'
  | 'ELIGIBILITY_FAIL'
  | 'MOVE_TO_FINAL_MANAGER_APPROVAL'
  | 'FINAL_MANAGER_APPROVE'
  | 'COMPLETE_WORK'
  | 'MANAGER_APPROVE_OVERLOAD_FORWARD';

export type WorkflowActionVariant = 'primary' | 'secondary';
export type WorkflowActionIntent = 'progress' | 'warning' | 'neutral';
export type WorkflowActionFlow = 'primary' | 'info' | 'warning' | 'success' | 'danger' | 'neutral';
export type WorkflowActionHandlerType = 'modal' | 'schedule_dialog' | 'survey_fail_dialog';

export const WORKFLOW_ACTION_LABELS: Record<WorkflowActionKey, string> = {
  DOC_COMPLETE: 'ตรวจเอกสารครบ',
  DOC_INCOMPLETE_COLLECT_ON_SITE: 'เอกสารไม่ครบ (รับเอกสารหน้างาน)',
  DOC_INCOMPLETE_WAIT_CUSTOMER: 'แจ้งว่ารอเอกสารจากลูกค้า',
  CONFIRM_DOCS_RECEIVED: 'ได้รับเอกสารแล้ว',
  START_SURVEY: 'เริ่มสำรวจ',
  SCHEDULE_SURVEY: 'กำหนดวันสำรวจ',
  EDIT_SURVEY_DATE: 'แก้ไขวันนัด',
  COMPLETE_SURVEY: 'สำรวจเสร็จ',
  SURVEY_PASS: 'บันทึกว่าสำรวจผ่าน',
  SURVEY_FAIL: 'บันทึกว่าสำรวจไม่ผ่าน',
  SURVEY_NEEDS_EXPANSION: 'สำรวจแล้วพบว่าต้องขยายเขต',
  THREE_PHASE_CAPABLE: 'ระบบรองรับ 3 เฟส',
  THREE_PHASE_NEEDS_EXPANSION: 'ส่งต่องานขยายเขต',
  REPORT_CUSTOMER_FIX: 'ผู้ใช้ไฟแจ้งว่าแก้ไขแล้ว',
  SCHEDULE_RESURVEY: 'นัดตรวจซ้ำ',
  PHOTO_APPROVE: 'ตรวจข้อมูลแก้ไขผ่าน',
  PHOTO_REJECT_TO_RESURVEY: 'นัดสำรวจใหม่',
  ISSUE_BILL: 'ส่งเข้าการเงิน / ออกใบแจ้งหนี้',
  SURVEYOR_SIGN: 'เซ็นใบแจ้งหนี้แล้ว',
  CONFIRM_PAYMENT: 'ชำระเงินแล้ว',
  MANAGER_APPROVE: 'อนุมัติส่งต่อ Flow มิเตอร์',
  MANAGER_RETURN_FOR_RESURVEY: 'ส่งกลับให้ตรวจสอบใหม่',
  RESTART_RETURNED_RESURVEY: 'ตั้งต้นงานสำรวจใหม่',
  LAYOUT_DRAWING_DONE: 'วาดผังขยายเขตเสร็จ',
  DISPATCHED_TO_KRABI: 'ส่งเอกสารขยายเขตไปกระบี่',
  KRABI_ACCEPT_AND_START: 'กระบี่รับงานขยายเขต',
  KRABI_RETURN_FOR_FIX: 'เอกสารไม่พร้อม ส่งกลับแก้ไข',
  KRABI_FIX_COMPLETED: 'แก้ไขเอกสารแล้ว / พร้อมส่งใหม่',
  KRABI_ESTIMATION_COMPLETED: 'ประมาณการขยายเขตเสร็จ',
  KRABI_BILL_ISSUED: 'ออกใบแจ้งหนี้ขยายเขตแล้ว',
  COORDINATED_WITH_CONSTRUCTION: 'ส่งต่อก่อสร้างขยายเขต',
  COMPLETE_DESIGN_ESTIMATE: 'ออกแบบ / ประเมินเสร็จ',
  ISSUE_3PHASE_BILL: 'ออกใบแจ้งหนี้ 3 เฟส',
  CONFIRM_3PHASE_PAYMENT: 'ยืนยันชำระเงิน 3 เฟส',
  COMPLETE_INSTALLATION: 'ติดตั้งเปลี่ยนมิเตอร์เสร็จ',
  COMPLETE_INSPECTION: 'ตรวจสอบหลังติดตั้งผ่าน',
  SEND_PRE_KRABI_APPROVAL: 'ส่งให้ ผจก.อ่าวนางอนุมัติก่อนส่งกระบี่',
  APPROVE_PRE_KRABI: 'อนุมัติก่อนส่งกระบี่',
  MOVE_TO_WAIT_KRABI_APPROVAL: 'ส่งเอกสารไปกระบี่',
  MARK_KRABI_APPROVED: 'บันทึกว่ากระบี่อนุมัติ',
  MARK_KRABI_REJECTED: 'บันทึกว่ากระบี่ตีกลับ',
  START_DOCUMENT_FIX: 'แก้ไขเอกสาร',
  RESENT_TO_KRABI: 'ส่งเอกสารไปกระบี่ใหม่',
  RECEIVE_FROM_KRABI: 'รับเอกสารกลับจากกระบี่',
  SEND_TO_ELIGIBILITY_REVIEW: 'ตรวจสอบสิทธิ์',
  ELIGIBILITY_PASS: 'บันทึกว่าตรวจสอบสิทธิ์ผ่าน',
  ELIGIBILITY_FAIL: 'บันทึกว่าตรวจสอบสิทธิ์ไม่ผ่าน',
  MOVE_TO_FINAL_MANAGER_APPROVAL: 'ส่งให้ ผจก.อ่าวนางอนุมัติรอบสุดท้าย',
  FINAL_MANAGER_APPROVE: 'อนุมัติปิดงาน',
  COMPLETE_WORK: 'ปิดงานเสร็จสิ้น',
  MANAGER_APPROVE_OVERLOAD_FORWARD: 'อนุมัติบันทึกให้กระบี่ปรับปรุงระบบจำหน่าย'
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
  WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL: 'กรุณาอนุมัติก่อนส่งกระบี่',
  SENT_TO_KRABI: 'กรุณายืนยันเข้าคิวรอกระบี่อนุมัติ',
  WAIT_KRABI_APPROVAL: 'กรุณาบันทึกผลพิจารณาจากกระบี่',
  KRABI_NEEDS_CORRECTION: 'กรุณาเริ่มแก้ไขเอกสารตามข้อแก้ไขจากกระบี่',
  DOCUMENT_FIX: 'กรุณาส่งเอกสารไปกระบี่ใหม่',
  RESENT_TO_KRABI: 'กรุณายืนยันเข้าคิวรอกระบี่อนุมัติ',
  KRABI_APPROVED: 'กรุณาบันทึกรับเอกสารกลับจากกระบี่',
  WAIT_RECEIVE_FROM_KRABI: 'กรุณาตรวจสอบสิทธิ์',
  WAIT_ELIGIBILITY_REVIEW: 'กรุณาเลือกผลการตรวจสอบสิทธิ์',
  WAIT_BILLING: 'กรุณาออกใบแจ้งหนี้',
  WAIT_ACTION_CONFIRMATION: 'กรุณาส่งให้ผู้จัดการอ่าวนางอนุมัติรอบสุดท้าย',
  WAIT_AONANG_MANAGER_FINAL_APPROVAL: 'กรุณาอนุมัติปิดงาน',
  WAIT_MANAGER_REVIEW: 'กรุณาตรวจสอบและอนุมัติส่งต่อ หรือส่งกลับให้ตรวจสอบใหม่',
  RETURNED_FOR_RESURVEY: 'กรุณามอบหมายนักสำรวจใหม่และกำหนดวันนัดสำรวจใหม่ เพื่อเริ่มรอบสำรวจใหม่ทั้งหมด',
  SURVEY_OVERLOAD_REPORTED: 'กรุณาตรวจสอบบันทึกโหลดเกินและอนุมัติส่งต่อกระบี่'
};

export function getWorkflowInstruction(status: RequestStatus): string {
  return STATUS_INSTRUCTION[status] ?? 'กรุณาดำเนินการตาม workflow';
}

export type AvailableRequestAction = {
  key: WorkflowActionKey;
  label: string;
  variant: WorkflowActionVariant;
  intent: WorkflowActionIntent;
  flow: WorkflowActionFlow;
  handlerType: WorkflowActionHandlerType;
  requiresConfirmation?: string;
};

export type QueueWorkflowAction = AvailableRequestAction;

type WorkflowActionResolverRequest = Pick<
  ServiceRequest,
  | 'status'
  | 'request_type'
  | 'fix_verification_mode'
  | 'scheduled_survey_date'
  | 'survey_date_current'
  | 'invoice_signed_at'
  | 'paid_at'
  | 'is_document_ready'
> &
  Partial<Pick<ServiceRequest, 'id' | 'flow_type' | 'three_phase_capability_result'>>;

const DOCUMENT_WORKFLOW_DEBUG_STATUSES: RequestStatus[] = [
  'WAIT_LAYOUT_DRAWING',
  'WAITING_TO_SEND_TO_KRABI',
  'SENT_TO_KRABI',
  'WAIT_KRABI_DOCUMENT_CHECK',
  'KRABI_NEEDS_DOCUMENT_FIX',
  'KRABI_IN_PROGRESS',
  'KRABI_ESTIMATION_COMPLETED',
  'KRABI_NEEDS_CORRECTION',
  'DOCUMENT_FIX',
  'RESENT_TO_KRABI',
  'KRABI_APPROVED',
  'WAIT_RECEIVE_FROM_KRABI'
];

function dedupeWorkflowActions(actions: AvailableRequestAction[]): AvailableRequestAction[] {
  return Array.from(new Map(actions.map((action) => [action.key, action])).values());
}

function toAction(
  key: WorkflowActionKey,
  options: {
    variant: WorkflowActionVariant;
    intent?: WorkflowActionIntent;
    flow?: WorkflowActionFlow;
    handlerType?: WorkflowActionHandlerType;
    requiresConfirmation?: string;
  }
): AvailableRequestAction {
  const intent = options.intent ?? (options.variant === 'primary' ? 'progress' : 'neutral');

  return {
    key,
    label: getWorkflowActionLabel(key),
    variant: options.variant,
    intent,
    flow: options.flow ?? (intent === 'warning' ? 'warning' : options.variant === 'primary' ? 'primary' : 'neutral'),
    handlerType:
      options.handlerType ??
      (key === 'SURVEY_FAIL' ? 'survey_fail_dialog' : key === 'SCHEDULE_SURVEY' || key === 'EDIT_SURVEY_DATE' ? 'schedule_dialog' : 'modal'),
    requiresConfirmation: options.requiresConfirmation
  };
}

export function getAvailableRequestActions(
  request: WorkflowActionResolverRequest
): AvailableRequestAction[] {
  const status = request.status;
  const inExpansionWorkflow = shouldUseExpansionActionSet(request);

  if (status === 'WAIT_DOCUMENT_REVIEW') {
    const documentFlow: WorkflowActionFlow = 'success';
    return [
      toAction('DOC_COMPLETE', { variant: 'primary', flow: documentFlow, requiresConfirmation: 'ยืนยันว่าเอกสารครบถ้วนแล้วใช่หรือไม่?' }),
      toAction('DOC_INCOMPLETE_COLLECT_ON_SITE', { variant: 'secondary', flow: 'warning' }),
      toAction('DOC_INCOMPLETE_WAIT_CUSTOMER', { variant: 'secondary', flow: 'warning' })
    ];
  }

  if (status === 'WAIT_DOCUMENT_FROM_CUSTOMER') {
    return [
      toAction('CONFIRM_DOCS_RECEIVED', {
        variant: 'primary',
        flow: 'info',
        requiresConfirmation: 'ยืนยันว่าได้รับเอกสารจากลูกค้าแล้ว?'
      })
    ];
  }

  if (status === 'READY_FOR_SURVEY') {
    if (!request.survey_date_current && !request.scheduled_survey_date) {
      return [toAction('SCHEDULE_SURVEY', { variant: 'primary', flow: 'neutral' })];
    }

    if (!canStartSurvey({ status, scheduled_survey_date: request.scheduled_survey_date, survey_date_current: request.survey_date_current })) {
      return [];
    }

    return [
      toAction('START_SURVEY', {
        variant: 'primary',
        flow: 'primary',
        requiresConfirmation: 'ยืนยันเริ่มสำรวจหน้างาน?'
      }),
      toAction('EDIT_SURVEY_DATE', { variant: 'secondary', flow: 'neutral' })
    ];
  }

  if (status === 'READY_FOR_RESURVEY') {
    return [
      toAction('START_SURVEY', {
        variant: 'primary',
        flow: 'primary',
        requiresConfirmation: 'ยืนยันเริ่มตรวจซ้ำหน้างาน?'
      }),
      toAction('EDIT_SURVEY_DATE', { variant: 'secondary', flow: 'neutral' })
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
      // 30/100 (3 เฟส) reuses the exact 30/100 (1-phase) meter workflow after the 3-phase support check passes.
      ['METER_TO_3PHASE', 'METER_30_100_3P'].includes(request.request_type) &&
      canEvaluateThreePhaseCapability({
        status,
        request_type: request.request_type,
        three_phase_capability_result: request.three_phase_capability_result ?? null
      })
    ) {
      return [
        toAction('THREE_PHASE_CAPABLE', { variant: 'primary', flow: 'success', requiresConfirmation: 'ยืนยันว่าระบบรองรับ 3 เฟส?' }),
        toAction('THREE_PHASE_NEEDS_EXPANSION', {
          variant: 'secondary',
          flow: 'warning',
          requiresConfirmation: 'ยืนยันส่งต่องานเดิมเข้าสู่ flow ขยายเขตที่ WAIT_LAYOUT_DRAWING?'
        })
      ];
    }

    if (canMarkSurveyPassed({ status, request_type: request.request_type })) {
      const surveyActions = [
        toAction('SURVEY_PASS', { variant: 'primary', flow: 'success', requiresConfirmation: 'ยืนยันผลสำรวจผ่าน?' }),
        toAction('SURVEY_FAIL', { variant: 'secondary', intent: 'warning', flow: 'warning', handlerType: 'survey_fail_dialog' })
      ];

      if (['METER', 'METER_30_100_1P'].includes(request.request_type)) {
        surveyActions.push(
          toAction('SURVEY_NEEDS_EXPANSION', {
            variant: 'secondary',
            intent: 'warning',
            flow: 'warning'
          })
        );
      }

      return surveyActions;
    }

    return [
      toAction('COMPLETE_SURVEY', {
        variant: 'primary',
        flow: 'success',
        requiresConfirmation: 'ยืนยันว่าการสำรวจเสร็จสิ้นแล้ว?'
      })
    ];
  }

  if (['METER_TO_3PHASE', 'METER_30_100_3P'].includes(request.request_type) && status === 'CHECK_3PHASE_CAPABILITY') {
    return [
      toAction('THREE_PHASE_CAPABLE', { variant: 'primary', flow: 'success', requiresConfirmation: 'ยืนยันว่าระบบรองรับ 3 เฟส?' }),
      toAction('THREE_PHASE_NEEDS_EXPANSION', {
        variant: 'secondary',
        flow: 'warning',
        requiresConfirmation: 'ยืนยันส่งต่องานเดิมเข้าสู่ flow ขยายเขตที่ WAIT_LAYOUT_DRAWING?'
      })
    ];
  }

  if (status === 'WAIT_CUSTOMER_FIX' && ['METER', 'METER_30_100_1P', 'METER_30_100_3P', 'METER_TO_3PHASE'].includes(request.request_type)) {
    return [
      toAction('REPORT_CUSTOMER_FIX', { variant: 'primary', flow: 'info', requiresConfirmation: 'ยืนยันว่าลูกค้าแจ้งแก้ไขแล้ว?' }),
      toAction('SCHEDULE_RESURVEY', { variant: 'secondary', flow: 'warning', requiresConfirmation: 'นัดตรวจซ้ำทันทีใช่หรือไม่?' })
    ];
  }

  if (status === 'WAIT_FIX_REVIEW' && ['METER', 'METER_30_100_1P', 'METER_30_100_3P', 'METER_TO_3PHASE'].includes(request.request_type)) {
    return [toAction('PHOTO_APPROVE', { variant: 'primary', flow: 'success' }), toAction('PHOTO_REJECT_TO_RESURVEY', { variant: 'secondary', flow: 'warning' })].filter(
      (action) => action.key !== 'PHOTO_APPROVE' || canApproveFixFromPhoto({ status, fix_verification_mode: request.fix_verification_mode })
    );
  }


  if (inExpansionWorkflow && ['SURVEY_COMPLETED', 'WAIT_LAYOUT_DRAWING'].includes(status)) {
    return [toAction('LAYOUT_DRAWING_DONE', { variant: 'primary', flow: 'success', requiresConfirmation: 'ยืนยันวาดผังเสร็จแล้ว?' })];
  }

  if (inExpansionWorkflow && status === 'WAITING_TO_SEND_TO_KRABI') {
    return [toAction('DISPATCHED_TO_KRABI', { variant: 'primary', flow: 'primary' })];
  }

  if (inExpansionWorkflow && ['SENT_TO_KRABI', 'WAIT_KRABI_DOCUMENT_CHECK'].includes(status)) {
    return [
      toAction('KRABI_ACCEPT_AND_START', { variant: 'primary', flow: 'primary' }),
      toAction('KRABI_RETURN_FOR_FIX', { variant: 'secondary', intent: 'warning', flow: 'warning' })
    ];
  }

  if (inExpansionWorkflow && status === 'KRABI_NEEDS_DOCUMENT_FIX') {
    return [toAction('KRABI_FIX_COMPLETED', { variant: 'primary', flow: 'warning' })];
  }

  if (inExpansionWorkflow && status === 'KRABI_IN_PROGRESS') {
    return [toAction('KRABI_ESTIMATION_COMPLETED', { variant: 'primary', flow: 'success' })];
  }

  if (inExpansionWorkflow && status === 'KRABI_ESTIMATION_COMPLETED') {
    return [toAction('KRABI_BILL_ISSUED', { variant: 'primary', flow: 'success' })];
  }

  if (inExpansionWorkflow && status === 'BILL_ISSUED') {
    return [toAction('COORDINATED_WITH_CONSTRUCTION', { variant: 'primary', flow: 'success' })];
  }

  if (!inExpansionWorkflow && ['METER_30_100_1P', 'METER_30_100_3P'].includes(request.request_type)) {
    if (status === 'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL') {
      return [
        toAction('APPROVE_PRE_KRABI', { variant: 'primary', flow: 'primary' }),
        toAction('MANAGER_RETURN_FOR_RESURVEY', { variant: 'secondary', intent: 'warning', flow: 'warning' })
      ];
    }

    if (status === 'SENT_TO_KRABI') {
      return [toAction('MOVE_TO_WAIT_KRABI_APPROVAL', { variant: 'primary', flow: 'primary' })];
    }

    if (status === 'WAIT_KRABI_APPROVAL') {
      return [toAction('MARK_KRABI_APPROVED', { variant: 'primary', flow: 'success' }), toAction('MARK_KRABI_REJECTED', { variant: 'secondary', intent: 'warning', flow: 'danger' })];
    }

    if (status === 'KRABI_NEEDS_CORRECTION') {
      return [toAction('START_DOCUMENT_FIX', { variant: 'primary', flow: 'warning' })];
    }

    if (status === 'DOCUMENT_FIX') {
      return [toAction('RESENT_TO_KRABI', { variant: 'primary', flow: 'primary' })];
    }

    if (status === 'RESENT_TO_KRABI') {
      return [toAction('MOVE_TO_WAIT_KRABI_APPROVAL', { variant: 'primary', flow: 'primary' })];
    }

    if (status === 'KRABI_APPROVED') {
      return [toAction('RECEIVE_FROM_KRABI', { variant: 'primary', flow: 'info' })];
    }

    if (status === 'WAIT_RECEIVE_FROM_KRABI') {
      return [toAction('SEND_TO_ELIGIBILITY_REVIEW', { variant: 'primary', flow: 'primary' })];
    }

    if (status === 'WAIT_ELIGIBILITY_REVIEW') {
      return [
        toAction('ELIGIBILITY_PASS', { variant: 'primary', flow: 'success' }),
        toAction('ELIGIBILITY_FAIL', { variant: 'secondary', intent: 'warning', flow: 'warning' })
      ];
    }

    if (status === 'WAIT_BILLING') {
      return [toAction('ISSUE_BILL', { variant: 'primary', flow: 'primary' })];
    }

    if (status === 'WAIT_PAYMENT') {
      return [toAction('MOVE_TO_FINAL_MANAGER_APPROVAL', { variant: 'primary', flow: 'primary' })];
    }

    if (status === 'WAIT_ACTION_CONFIRMATION') {
      return [toAction('MOVE_TO_FINAL_MANAGER_APPROVAL', { variant: 'primary', flow: 'primary' })];
    }

    if (status === 'WAIT_AONANG_MANAGER_FINAL_APPROVAL') {
      return [toAction('FINAL_MANAGER_APPROVE', { variant: 'primary', flow: 'success' }), toAction('COMPLETE_WORK', { variant: 'secondary', flow: 'neutral' })];
    }
  }

  if (status === 'WAIT_MANAGER_REVIEW' && ['METER', 'METER_30_100_1P', 'METER_30_100_3P', 'METER_TO_3PHASE'].includes(request.request_type) && canMoveToManagerReview(request)) {
    if (isThirtyOneHundredRequestType(request.request_type)) {
      return [
        toAction('MANAGER_APPROVE', { variant: 'primary', flow: 'primary', requiresConfirmation: 'ยืนยันอนุมัติส่งต่อกระบี่?' }),
        toAction('MANAGER_RETURN_FOR_RESURVEY', { variant: 'secondary', intent: 'warning', flow: 'warning' })
      ];
    }

    return [toAction('MANAGER_APPROVE', { variant: 'primary', flow: 'success', requiresConfirmation: 'ยืนยันอนุมัติปิดงาน?' })];
  }

  if (status === 'RETURNED_FOR_RESURVEY' && isThirtyOneHundredRequestType(request.request_type)) {
    return [toAction('RESTART_RETURNED_RESURVEY', { variant: 'primary', flow: 'primary' })];
  }

  if (status === 'SURVEY_OVERLOAD_REPORTED') {
    return [toAction('MANAGER_APPROVE_OVERLOAD_FORWARD', { variant: 'primary', flow: 'warning', requiresConfirmation: 'ยืนยันอนุมัติบันทึกให้กระบี่รับเรื่องปรับปรุงระบบจำหน่าย?' })];
  }

  return [];
}

function logDocumentWorkflowResolution(request: WorkflowActionResolverRequest, actions: AvailableRequestAction[]): void {
  if (!DOCUMENT_WORKFLOW_DEBUG_STATUSES.includes(request.status)) {
    return;
  }

  const resolvedPrimaryAction = actions.find((action) => action.variant === 'primary')?.key ?? null;
  const documentStage = request.status;

  console.info('[document-workflow-primary-action-resolved]', {
    requestId: request.id ?? null,
    requestType: request.request_type,
    currentStatus: request.status,
    flowType: request.flow_type ?? null,
    expansionActionSet: shouldUseExpansionActionSet(request),
    threePhaseCapabilityResult: request.three_phase_capability_result ?? null,
    isDocumentReady: request.is_document_ready,
    documentStage,
    resolvedPrimaryAction,
    resolvedActions: actions.map((action) => action.key)
  });
}

export function resolveDocumentWorkflowAction(request: WorkflowActionResolverRequest): QueueWorkflowAction | null {
  const actions = dedupeWorkflowActions(getAvailableRequestActions(request));
  logDocumentWorkflowResolution(request, actions);
  return actions.find((action) => action.variant === 'primary') ?? null;
}

export function getPrimaryDocumentAction(request: WorkflowActionResolverRequest): QueueWorkflowAction | null {
  return resolveDocumentWorkflowAction(request);
}

export function getQueueWorkflowActions(
  request: WorkflowActionResolverRequest
): QueueWorkflowAction[] {
  const dedupedActions = dedupeWorkflowActions(getAvailableRequestActions(request));
  logDocumentWorkflowResolution(request, dedupedActions);
  return dedupedActions;
}

export function getWorkflowActionsForRequest(
  request: WorkflowActionResolverRequest
): AvailableRequestAction[] {
  const dedupedActions = dedupeWorkflowActions(getAvailableRequestActions(request));
  logDocumentWorkflowResolution(request, dedupedActions);
  return dedupedActions;
}
