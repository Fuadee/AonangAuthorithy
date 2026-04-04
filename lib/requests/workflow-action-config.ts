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
  | 'COMPLETE_SURVEY'
  | 'SURVEY_PASS'
  | 'REPORT_CUSTOMER_FIX'
  | 'PHOTO_APPROVE'
  | 'PHOTO_REJECT_TO_RESURVEY'
  | 'MOVE_TO_RESURVEY'
  | 'MANAGER_APPROVE';

export type WorkflowActionVariant = 'primary' | 'secondary';

export const WORKFLOW_ACTION_LABELS: Record<WorkflowActionKey, string> = {
  DOC_COMPLETE: 'เอกสารครบ',
  DOC_INCOMPLETE_COLLECT_ON_SITE: 'เอกสารไม่ครบ (รับเอกสารหน้างาน)',
  DOC_INCOMPLETE_WAIT_CUSTOMER: 'เอกสารไม่ครบ (รอลูกค้านำมา)',
  CONFIRM_DOCS_RECEIVED: 'ได้รับเอกสารแล้ว',
  START_SURVEY: 'รับงาน / ไปสำรวจ',
  COMPLETE_SURVEY: 'สำรวจเสร็จ',
  SURVEY_PASS: 'สำรวจผ่าน',
  REPORT_CUSTOMER_FIX: 'ผู้ใช้ไฟแจ้งว่าแก้ไขแล้ว',
  PHOTO_APPROVE: 'อนุมัติผ่านจากรูป',
  PHOTO_REJECT_TO_RESURVEY: 'รูปยังไม่พอ ต้องตรวจซ้ำ',
  MOVE_TO_RESURVEY: 'นัดตรวจซ้ำ',
  MANAGER_APPROVE: 'อนุมัติแล้ว'
};

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

export type QueueWorkflowAction = {
  key: WorkflowActionKey;
  variant: WorkflowActionVariant;
  requiresConfirmation?: string;
  requiresPrompt?: { message: string; field: string };
  fallbackToDetail?: boolean;
};

export function getQueueWorkflowActions(
  request: Pick<
    ServiceRequest,
    'status' | 'request_type' | 'fix_verification_mode' | 'scheduled_survey_date' | 'survey_date_current' | 'invoice_signed_at' | 'paid_at'
  >
): QueueWorkflowAction[] {
  const status = request.status;

  if (status === 'WAIT_DOCUMENT_REVIEW') {
    return [
      { key: 'DOC_COMPLETE', variant: 'primary', requiresConfirmation: 'ยืนยันว่าเอกสารครบถ้วนแล้วใช่หรือไม่?' },
      {
        key: 'DOC_INCOMPLETE_COLLECT_ON_SITE',
        variant: 'secondary',
        requiresPrompt: { message: 'ระบุหมายเหตุเอกสารขาด (รับเอกสารหน้างาน)', field: 'incomplete_docs_note' }
      },
      {
        key: 'DOC_INCOMPLETE_WAIT_CUSTOMER',
        variant: 'secondary',
        requiresPrompt: { message: 'ระบุหมายเหตุเอกสารขาด (รอลูกค้านำมา)', field: 'incomplete_docs_note' }
      }
    ];
  }

  if (status === 'WAIT_DOCUMENT_FROM_CUSTOMER') {
    return [{ key: 'CONFIRM_DOCS_RECEIVED', variant: 'primary', requiresConfirmation: 'ยืนยันว่าได้รับเอกสารจากลูกค้าแล้ว?' }];
  }

  if (status === 'READY_FOR_SURVEY') {
    if (!canStartSurvey({ status, scheduled_survey_date: request.scheduled_survey_date, survey_date_current: request.survey_date_current })) {
      return [];
    }

    return [{ key: 'START_SURVEY', variant: 'primary', requiresConfirmation: 'ยืนยันเริ่มสำรวจหน้างาน?' }];
  }

  if (status === 'READY_FOR_RESURVEY') {
    return [{ key: 'START_SURVEY', variant: 'primary', requiresConfirmation: 'ยืนยันเริ่มตรวจซ้ำหน้างาน?' }];
  }

  if (status === 'IN_SURVEY') {
    if (request.request_type === 'METER' && canMarkSurveyPassed({ status, request_type: request.request_type })) {
      return [
        { key: 'SURVEY_PASS', variant: 'primary', requiresConfirmation: 'ยืนยันผลสำรวจผ่าน?' },
        { key: 'COMPLETE_SURVEY', variant: 'secondary', fallbackToDetail: true }
      ];
    }

    return [{ key: 'COMPLETE_SURVEY', variant: 'primary', requiresConfirmation: 'ยืนยันว่าการสำรวจเสร็จสิ้นแล้ว?' }];
  }

  if (status === 'WAIT_CUSTOMER_FIX' && request.request_type === 'METER') {
    return [
      { key: 'REPORT_CUSTOMER_FIX', variant: 'primary', requiresConfirmation: 'ยืนยันว่าลูกค้าแจ้งแก้ไขแล้ว?' },
      { key: 'MOVE_TO_RESURVEY', variant: 'secondary', requiresConfirmation: 'นัดตรวจซ้ำทันทีใช่หรือไม่?' }
    ];
  }

  if (status === 'WAIT_FIX_REVIEW' && request.request_type === 'METER') {
    return [
      {
        key: 'PHOTO_APPROVE',
        variant: 'primary',
        requiresPrompt: { message: 'ชื่อผู้ตรวจรูป', field: 'photo_reviewed_by' }
      },
      {
        key: 'PHOTO_REJECT_TO_RESURVEY',
        variant: 'secondary',
        requiresPrompt: { message: 'ชื่อผู้ตรวจรูป', field: 'photo_reviewed_by' }
      }
    ].filter((action) => action.key !== 'PHOTO_APPROVE' || canApproveFixFromPhoto({ status, fix_verification_mode: request.fix_verification_mode }));
  }

  if (status === 'WAIT_MANAGER_REVIEW' && request.request_type === 'METER' && canMoveToManagerReview(request)) {
    return [{ key: 'MANAGER_APPROVE', variant: 'primary', requiresConfirmation: 'ยืนยันอนุมัติปิดงาน?' }];
  }

  return [];
}
