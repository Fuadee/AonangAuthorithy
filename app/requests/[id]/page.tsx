import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MeterWorkflowActions } from '@/components/meter-workflow-actions';
import { LocationPreview } from '@/components/location-preview';
import { SurveyorActionWorkflow } from '@/components/surveyor-action-workflow';
import {
  canMoveToBilling,
  canMoveToManagerReview,
  getFinalApprovalSource,
  getCurrentSurveyDate,
  getCustomerDelaySummary,
  getKrabiDispatchWarning,
  getDocumentReviewRules,
  getDocumentStatusSummary,
  getPostSurveyFixSummary,
  getRequestQueueGroup,
  getRequestQueueGroupLabel,
  getSurveyScheduleSummary,
  hasSurveyBeenRescheduled,
  normalizeSurveyWorkflowStatus,
  getRequestStatusLabel,
  isInvoiceSigned,
  needsRescheduleAfterDocuments,
  isPaid,
  REQUEST_TYPE_LABELS,
  RequestStatus,
  RequestType
} from '@/lib/requests/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type RequestDetailPageProps = {
  params: Promise<{ id: string }>;
};

type TimelineItem = {
  key: string;
  title: string;
  description?: string;
  at: string;
};

function formatSurveyDate(value: string | null): string {
  if (!value) {
    return '-';
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString('th-TH', { dateStyle: 'full' });
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('th-TH');
}

function formatCurrency(value: number | null): string {
  if (value === null) {
    return '-';
  }

  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 2
  }).format(value);
}

function getNextStepSummary(status: RequestStatus, requestType: RequestType): { nextStep: string; owner: string } {
  const normalizedStatus = normalizeSurveyWorkflowStatus(status);

  if (requestType === 'METER') {
    switch (normalizedStatus) {
      case 'WAIT_DOCUMENT_REVIEW':
        return {
          nextStep: 'ตรวจเอกสารก่อนรับงาน หรือยืนยันเอกสารครบหลังสำรวจ (กรณีรับเอกสารหน้างาน)',
          owner: 'เจ้าหน้าที่รับคำร้อง / นักสำรวจ'
        };
      case 'WAIT_DOCUMENT_FROM_CUSTOMER':
        return {
          nextStep: 'รอผู้ใช้ไฟนำเอกสารมาให้ แล้วกดยืนยันได้รับเอกสาร',
          owner: 'เจ้าหน้าที่รับคำร้อง'
        };
      case 'READY_FOR_SURVEY':
        return {
          nextStep: 'รับงานแล้วไปสำรวจ',
          owner: 'นักสำรวจ'
        };
      case 'IN_SURVEY':
        return {
          nextStep: 'เลือกผลสำรวจว่า “ผ่าน” หรือ “ไม่ผ่านและรอผู้ใช้ไฟแก้ไข”',
          owner: 'นักสำรวจ'
        };
      case 'WAIT_CUSTOMER_FIX':
        return {
          nextStep: 'รอผู้ใช้ไฟแจ้งว่าแก้ไขแล้ว จากนั้นเลือกว่า “ตรวจจากรูป” หรือ “นัดตรวจซ้ำ”',
          owner: 'นักสำรวจ / เจ้าหน้าที่'
        };
      case 'WAIT_FIX_REVIEW':
        return {
          nextStep: 'ตรวจรูปที่ผู้ใช้ไฟส่งมา แล้วตัดสินใจ “ผ่านจากรูป” หรือ “ตรวจซ้ำ”',
          owner: 'เจ้าหน้าที่'
        };
      case 'READY_FOR_RESURVEY':
        return {
          nextStep: 'นัดตรวจซ้ำและออกตรวจซ้ำหน้างาน',
          owner: 'นักสำรวจ'
        };
      case 'WAIT_BILLING':
        return {
          nextStep: 'เจ้าหน้าที่ออกใบแจ้งหนี้ พร้อมบันทึกจำนวนเงินและผู้ดำเนินการ',
          owner: 'การเงิน'
        };
      case 'WAIT_ACTION_CONFIRMATION':
        return {
          nextStep: 'บันทึก “เซ็นใบแจ้งหนี้” และ “ชำระเงิน” ให้ครบทั้งสองรายการ (ทำสลับลำดับกันได้)',
          owner: 'นักสำรวจ / การเงิน'
        };
      case 'WAIT_MANAGER_REVIEW':
        return {
          nextStep: 'ผู้จัดการตรวจเอกสารและอนุมัติก่อนปิดงาน',
          owner: 'ผู้จัดการ'
        };
      case 'COMPLETED':
        return {
          nextStep: 'ปิดงานเรียบร้อยแล้ว',
          owner: 'เสร็จสิ้น'
        };
      default:
        break;
    }
  }

  switch (normalizedStatus) {
    case 'WAIT_DOCUMENT_REVIEW':
      return {
        nextStep: 'ตรวจเอกสารตาม checklist ของประเภทคำร้อง แล้วตัดสินใจผ่าน/ขอเอกสารเพิ่ม',
        owner: 'เจ้าหน้าที่รับคำร้อง'
      };
    case 'WAIT_DOCUMENT_FROM_CUSTOMER':
      return {
        nextStep: 'รอผู้ใช้ไฟนำเอกสารเพิ่มเติม แล้ววนกลับมาตรวจเอกสาร',
        owner: 'เจ้าหน้าที่รับคำร้อง / ผู้ใช้ไฟ'
      };
    case 'READY_FOR_SURVEY':
      return {
        nextStep: 'กำหนดวันสำรวจ แล้วส่งต่อให้นักสำรวจลงพื้นที่',
        owner: 'เจ้าหน้าที่รับคำร้อง / นักสำรวจ'
      };
    case 'IN_SURVEY':
      return {
        nextStep: 'สำรวจหน้างานและบันทึกผลสำรวจ',
        owner: 'นักสำรวจ'
      };
    case 'SURVEY_COMPLETED':
    case 'WAIT_LAYOUT_DRAWING':
      return {
        nextStep: 'วาดผังและยืนยัน “วาดผังเสร็จ”',
        owner: 'นักสำรวจ'
      };
    case 'READY_TO_SEND_KRABI':
      return {
        nextStep: 'รอฝ่ายส่งเอกสารจัดเข้าคิวรอบส่งวันพุธ/ศุกร์',
        owner: 'ฝ่ายส่งเอกสาร'
      };
    case 'QUEUED_FOR_KRABI_DISPATCH':
      return {
        nextStep: 'รอออกรอบส่งตามวันที่วางแผน',
        owner: 'ฝ่ายส่งเอกสาร'
      };
    case 'SENT_TO_KRABI':
      return {
        nextStep: 'เอกสารถูกส่งถึงกระบี่แล้ว รอเข้าขั้นตรวจรับเอกสาร',
        owner: 'ฝ่ายกระบี่'
      };
    case 'WAIT_KRABI_DOCUMENT_CHECK':
      return {
        nextStep: 'กระบี่ตรวจรับเอกสาร หากครบจึงรับดำเนินการ หากไม่ครบให้ส่งกลับแก้ไข',
        owner: 'ฝ่ายกระบี่'
      };
    case 'KRABI_NEEDS_DOCUMENT_FIX':
      return {
        nextStep: 'อ่าวนางแก้ไขเอกสารตามเหตุผลที่กระบี่ตีกลับ แล้วกดพร้อมส่งใหม่',
        owner: 'ฝ่ายอ่าวนาง'
      };
    case 'KRABI_IN_PROGRESS':
      return {
        nextStep: 'ติดตามสถานะประมาณการจากฝั่งกระบี่',
        owner: 'ฝ่ายกระบี่'
      };
    case 'KRABI_ESTIMATION_COMPLETED':
      return {
        nextStep: 'ยืนยันว่าออกใบแจ้งหนี้แล้ว',
        owner: 'เจ้าหน้าที่'
      };
    case 'BILL_ISSUED':
      return {
        nextStep: 'ยืนยันว่าประสานงานแผนกก่อสร้างแล้ว เพื่อจบ flow ฝั่งกระบี่',
        owner: 'เจ้าหน้าที่'
      };
    case 'COORDINATED_WITH_CONSTRUCTION':
      return {
        nextStep: 'จบขั้นตอนฝั่งกระบี่แล้ว และส่งต่อแผนกก่อสร้างเรียบร้อย',
        owner: 'เสร็จสิ้น'
      };
    default:
      return {
        nextStep: 'รอตรวจสอบคำร้องและมอบหมายงาน',
        owner: 'เจ้าหน้าที่รับคำร้อง'
      };
  }
}

function getTimeline(request: {
  created_at: string;
  survey_reviewed_at: string | null;
  survey_reschedule_date: string | null;
  survey_completed_at: string | null;
  billed_at: string | null;
  invoice_signed_at: string | null;
  paid_at: string | null;
  updated_at: string;
  status: RequestStatus;
  survey_note: string | null;
  billing_note: string | null;
  billed_by: string | null;
  billing_amount: number | null;
  invoice_signed_by: string | null;
  paid_by: string | null;
  document_status: 'COMPLETE' | 'INCOMPLETE' | null;
  collect_docs_on_site: boolean;
  survey_date_initial: string | null;
  survey_date_current: string | null;
  previous_survey_date: string | null;
  survey_reschedule_reason: string | null;
  survey_rescheduled_at: string | null;
  documents_received_at: string | null;
  awaiting_customer_documents_since: string | null;
  survey_result: 'PASS' | 'FAIL' | null;
  customer_fix_note: string | null;
  customer_fix_reported_at: string | null;
  photo_review_status: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  photo_reviewed_at: string | null;
  photo_reviewed_by: string | null;
  fix_approved_via: 'PHOTO' | 'RESURVEY' | null;
  ready_to_send_krabi_at: string | null;
  queued_for_dispatch_at: string | null;
  planned_dispatch_date: string | null;
  dispatched_to_krabi_at: string | null;
  dispatched_to_krabi_by: string | null;
  krabi_in_progress_at: string | null;
  krabi_completed_at: string | null;
}): TimelineItem[] {
  const items: TimelineItem[] = [
    {
      key: 'created',
      title: 'สร้างคำร้อง',
      at: request.created_at
    }
  ];

  if (request.survey_reviewed_at) {
    items.push({
      key: 'reviewed',
      title: 'ตรวจเอกสารล่าสุด',
      description: request.survey_note ? `หมายเหตุ: ${request.survey_note}` : undefined,
      at: request.survey_reviewed_at
    });
  }

  if (request.survey_reschedule_date) {
    items.push({
      key: 'rescheduled',
      title: 'ขอเลื่อนวันสำรวจ',
      description: `วันสำรวจใหม่: ${formatSurveyDate(request.survey_reschedule_date)}`,
      at: `${request.survey_reschedule_date}T00:00:00`
    });
  }

  if (request.survey_date_initial) {
    items.push({
      key: 'survey-initial',
      title: 'นัดสำรวจครั้งแรก',
      description: `วันนัด: ${formatSurveyDate(request.survey_date_initial)}`,
      at: `${request.survey_date_initial}T00:00:00`
    });
  }

  if (request.awaiting_customer_documents_since) {
    items.push({
      key: 'awaiting-customer-docs',
      title: 'เอกสารไม่ครบ / รอผู้ใช้ไฟนำเอกสารมาให้',
      at: request.awaiting_customer_documents_since
    });
  }

  if (request.documents_received_at) {
    items.push({
      key: 'documents-received',
      title: 'ได้รับเอกสารจากลูกค้า',
      at: request.documents_received_at
    });
  }

  if (request.survey_rescheduled_at && request.survey_date_current) {
    items.push({
      key: 'rescheduled-latest',
      title: 'นัดสำรวจใหม่',
      description: `${formatSurveyDate(request.survey_date_current)}${request.survey_reschedule_reason ? ` | เหตุผล: ${request.survey_reschedule_reason}` : ''}`,
      at: request.survey_rescheduled_at
    });
  }

  if (request.survey_completed_at) {
    items.push({
      key: 'completed',
      title: request.survey_result === 'FAIL' ? 'สำรวจไม่ผ่าน' : 'สำรวจหน้างานเสร็จ',
      description: request.customer_fix_note ? `รายการที่ต้องแก้: ${request.customer_fix_note}` : undefined,
      at: request.survey_completed_at
    });
  }

  if (request.ready_to_send_krabi_at) {
    items.push({
      key: 'ready-to-send-krabi',
      title: 'เตรียมส่งเอกสารให้กระบี่',
      at: request.ready_to_send_krabi_at
    });
  }

  if (request.queued_for_dispatch_at) {
    items.push({
      key: 'queued-dispatch',
      title: 'เข้าคิวส่งเอกสารไปกระบี่',
      description: request.planned_dispatch_date ? `รอบส่ง: ${formatSurveyDate(request.planned_dispatch_date)}` : undefined,
      at: request.queued_for_dispatch_at
    });
  }

  if (request.dispatched_to_krabi_at) {
    items.push({
      key: 'sent-to-krabi',
      title: 'ส่งเอกสารไปกระบี่แล้ว',
      description: request.dispatched_to_krabi_by ? `ผู้ส่ง: ${request.dispatched_to_krabi_by}` : undefined,
      at: request.dispatched_to_krabi_at
    });
  }

  if (request.krabi_in_progress_at) {
    items.push({
      key: 'krabi-in-progress',
      title: 'กระบี่รับดำเนินการ / กำลังประมาณการ',
      at: request.krabi_in_progress_at
    });
  }

  if (request.krabi_completed_at) {
    items.push({
      key: 'krabi-completed',
      title: 'กระบี่ประมาณการเสร็จแล้ว',
      at: request.krabi_completed_at
    });
  }

  if (request.customer_fix_reported_at) {
    items.push({
      key: 'customer-fix-reported',
      title: 'ผู้ใช้ไฟแจ้งว่าแก้ไขแล้ว / ส่งรูปแล้ว',
      at: request.customer_fix_reported_at
    });
  }

  if (request.photo_review_status && request.photo_reviewed_at) {
    items.push({
      key: 'photo-review',
      title: request.photo_review_status === 'APPROVED' ? 'ตรวจรูปแล้วผ่าน' : 'ตรวจรูปแล้วต้องลงพื้นที่ตรวจซ้ำ',
      description: request.photo_reviewed_by ? `ผู้ตรวจ: ${request.photo_reviewed_by}` : undefined,
      at: request.photo_reviewed_at
    });
  }

  if (request.collect_docs_on_site) {
    items.push({
      key: 'collect-docs-on-site',
      title: 'กำหนดเป็นเคสรับเอกสารหน้างาน',
      description: 'สามารถรับงานและไปสำรวจได้ แต่ต้องยืนยันเอกสารครบหลังสำรวจ',
      at: request.updated_at
    });
  }

  if (request.billed_at) {
    const detail = [`จำนวนเงิน: ${formatCurrency(request.billing_amount)}`];
    if (request.billed_by) {
      detail.push(`ออกโดย: ${request.billed_by}`);
    }
    if (request.billing_note) {
      detail.push(`หมายเหตุ: ${request.billing_note}`);
    }

    items.push({
      key: 'billed',
      title: 'ออกใบแจ้งหนี้แล้ว',
      description: detail.join(' | '),
      at: request.billed_at
    });
  }

  if (request.invoice_signed_at) {
    items.push({
      key: 'surveyor-signed',
      title: 'นักสำรวจเซ็นรับรองใบแจ้งหนี้',
      description: request.invoice_signed_by ? `ผู้เซ็น: ${request.invoice_signed_by}` : undefined,
      at: request.invoice_signed_at
    });
  }

  if (request.paid_at) {
    items.push({
      key: 'paid',
      title: 'ยืนยันชำระเงินแล้ว',
      description: request.paid_by ? `ยืนยันโดย: ${request.paid_by}` : undefined,
      at: request.paid_at
    });
  }

  if (request.updated_at !== request.created_at) {
    items.push({
      key: 'updated',
      title: 'อัปเดตข้อมูลล่าสุด',
      description: `สถานะล่าสุด: ${getRequestStatusLabel(request.status)}`,
      at: request.updated_at
    });
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function getActionTitle(status: RequestStatus, requestType: RequestType): string {
  if (
    requestType === 'METER' &&
    [
      'WAIT_DOCUMENT_REVIEW',
      'WAIT_DOCUMENT_FROM_CUSTOMER',
      'READY_FOR_SURVEY',
      'READY_FOR_RESURVEY',
      'IN_SURVEY',
      'WAIT_CUSTOMER_FIX',
      'WAIT_FIX_REVIEW',
      'WAIT_BILLING',
      'WAIT_ACTION_CONFIRMATION',
      'WAIT_MANAGER_REVIEW'
    ].includes(status)
  ) {
    return 'การดำเนินการงานขอมิเตอร์หลังสำรวจ';
  }

  switch (status) {
    case 'PENDING_SURVEY_REVIEW':
      return 'ขั้นตอนสำหรับนักสำรวจ';
    case 'SURVEY_ACCEPTED':
      return 'งานที่ทำได้ตอนนี้';
    case 'SURVEY_DOCS_INCOMPLETE':
    case 'WAIT_DOCUMENT_FROM_CUSTOMER':
    case 'SURVEY_COMPLETED':
    case 'WAIT_LAYOUT_DRAWING':
    case 'READY_TO_SEND_KRABI':
    case 'QUEUED_FOR_KRABI_DISPATCH':
    case 'SENT_TO_KRABI':
    case 'WAIT_KRABI_DOCUMENT_CHECK':
    case 'KRABI_NEEDS_DOCUMENT_FIX':
    case 'KRABI_IN_PROGRESS':
    case 'KRABI_ESTIMATION_COMPLETED':
    case 'BILL_ISSUED':
    case 'COORDINATED_WITH_CONSTRUCTION':
    case 'WAIT_DOCUMENT_REVIEW':
      return 'สถานะงาน';
    default:
      return 'การดำเนินการ';
  }
}

export default async function RequestDetailPage({ params }: RequestDetailPageProps) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select(
      'id,request_no,customer_name,phone,request_type,area_name,assignee_id,assignee_name,assigned_surveyor,scheduled_survey_date,survey_date_initial,survey_date_current,previous_survey_date,survey_rescheduled_at,survey_reschedule_reason,documents_received_at,awaiting_customer_documents_since,status,survey_note,survey_reschedule_date,survey_reviewed_at,survey_completed_at,survey_result,fix_verification_mode,customer_fix_note,customer_fix_reported_at,photo_review_status,photo_reviewed_at,photo_reviewed_by,fix_approved_via,document_status,collect_docs_on_site,incomplete_docs_note,billing_amount,billing_note,billed_at,billed_by,invoice_signed_at,invoice_signed_by,paid_at,paid_by,ready_to_send_krabi_at,queued_for_dispatch_at,planned_dispatch_date,dispatched_to_krabi_at,dispatched_to_krabi_by,krabi_received_at,krabi_in_progress_at,krabi_completed_at,latitude,longitude,location_note,created_at,updated_at'
    )
    .eq('id', id)
    .maybeSingle();

  if (requestError) {
    throw new Error(requestError.message);
  }

  if (!request) {
    notFound();
  }

  const requestStatus = request.status as RequestStatus;
  const normalizedRequestStatus = normalizeSurveyWorkflowStatus(requestStatus);
  const requestType = request.request_type as RequestType;
  const currentQueue = getRequestQueueGroup(requestStatus);
  const isSurveyorFlowStatus = currentQueue === 'SURVEY';
  const isUnifiedWorkflowStatus =
    [
      'SURVEY_COMPLETED',
      'WAIT_DOCUMENT_REVIEW',
      'WAIT_DOCUMENT_FROM_CUSTOMER',
      'READY_FOR_SURVEY',
      'READY_FOR_RESURVEY',
      'IN_SURVEY',
      'WAIT_CUSTOMER_FIX',
      'WAIT_FIX_REVIEW',
      'WAIT_BILLING',
      'WAIT_ACTION_CONFIRMATION',
      'WAIT_MANAGER_REVIEW',
      'WAIT_LAYOUT_DRAWING',
      'READY_TO_SEND_KRABI',
      'QUEUED_FOR_KRABI_DISPATCH',
      'SENT_TO_KRABI',
      'WAIT_KRABI_DOCUMENT_CHECK',
      'KRABI_NEEDS_DOCUMENT_FIX',
      'KRABI_IN_PROGRESS',
      'KRABI_ESTIMATION_COMPLETED',
      'BILL_ISSUED',
      'COORDINATED_WITH_CONSTRUCTION'
    ].includes(normalizedRequestStatus);
  const documentSummary = getDocumentStatusSummary(request);
  const postSurveyFixSummary = getPostSurveyFixSummary(request);
  const invoiceSigned = isInvoiceSigned(request);
  const paid = isPaid(request);
  const canGoBilling = canMoveToBilling(request);
  const readyForManager = canMoveToManagerReview(request);
  const nextStepSummary = getNextStepSummary(requestStatus, requestType);
  const documentReviewRules = getDocumentReviewRules(requestType);
  const currentSurveyDate = getCurrentSurveyDate(request);
  const hasLocation = request.latitude !== null && request.longitude !== null;
  const googleMapsUrl = hasLocation
    ? `https://www.google.com/maps?q=${request.latitude},${request.longitude}`
    : null;
  const surveySummary = getSurveyScheduleSummary(request);
  const customerDelaySummary = getCustomerDelaySummary(request);
  const showRescheduleNotice =
    hasSurveyBeenRescheduled(request) && request.survey_reschedule_reason?.includes('รอเอกสารจากผู้ใช้ไฟ');
  const timeline = getTimeline({
    created_at: request.created_at,
    survey_reviewed_at: request.survey_reviewed_at,
    survey_reschedule_date: request.survey_reschedule_date,
    survey_completed_at: request.survey_completed_at,
    billed_at: request.billed_at,
    invoice_signed_at: request.invoice_signed_at,
    paid_at: request.paid_at,
    updated_at: request.updated_at,
    status: requestStatus,
    survey_note: request.survey_note,
    billing_note: request.billing_note,
    billed_by: request.billed_by,
    billing_amount: request.billing_amount,
    invoice_signed_by: request.invoice_signed_by,
    paid_by: request.paid_by,
    document_status: request.document_status,
    collect_docs_on_site: request.collect_docs_on_site,
    survey_date_initial: request.survey_date_initial,
    survey_date_current: request.survey_date_current,
    previous_survey_date: request.previous_survey_date,
    survey_reschedule_reason: request.survey_reschedule_reason,
    survey_rescheduled_at: request.survey_rescheduled_at,
    documents_received_at: request.documents_received_at,
    awaiting_customer_documents_since: request.awaiting_customer_documents_since,
    survey_result: request.survey_result,
    customer_fix_note: request.customer_fix_note,
    customer_fix_reported_at: request.customer_fix_reported_at,
    photo_review_status: request.photo_review_status,
    photo_reviewed_at: request.photo_reviewed_at,
    photo_reviewed_by: request.photo_reviewed_by,
    fix_approved_via: request.fix_approved_via,
    ready_to_send_krabi_at: request.ready_to_send_krabi_at,
    queued_for_dispatch_at: request.queued_for_dispatch_at,
    planned_dispatch_date: request.planned_dispatch_date,
    dispatched_to_krabi_at: request.dispatched_to_krabi_at,
    dispatched_to_krabi_by: request.dispatched_to_krabi_by,
    krabi_in_progress_at: request.krabi_in_progress_at,
    krabi_completed_at: request.krabi_completed_at
  });
  const krabiDispatchWarning = getKrabiDispatchWarning(request);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">รายละเอียดคำร้อง</p>
          <h2 className="text-2xl font-semibold">{request.request_no}</h2>
        </div>
        <Link className="btn-secondary" href="/dashboard">
          กลับไป Dashboard
        </Link>
      </div>

      <section className="card p-6">
        <h3 className="text-lg font-semibold">ข้อมูลผู้ยื่นคำร้อง</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-sm text-slate-500">ชื่อลูกค้า</dt>
            <dd className="mt-1 font-medium">{request.customer_name}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">โทรศัพท์</dt>
            <dd className="mt-1 font-medium">{request.phone || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">พื้นที่</dt>
            <dd className="mt-1 font-medium">{request.area_name || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">ประเภทคำร้อง</dt>
            <dd className="mt-1 font-medium">{REQUEST_TYPE_LABELS[requestType]}</dd>
          </div>
        </dl>
      </section>

      <section className="card p-6">
        <h3 className="text-lg font-semibold">สรุปสถานะงานล่าสุด</h3>
        <p className="mt-1 text-sm text-slate-500">หน้าดูข้อมูลเป็นหลัก กดปุ่มเฉพาะงานที่ต้องทำตอนนี้</p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-sm text-slate-500">คิวปัจจุบัน</dt>
            <dd className="mt-1 font-medium">{getRequestQueueGroupLabel(currentQueue)}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">สถานะปัจจุบัน</dt>
            <dd className="mt-1 font-medium">{getRequestStatusLabel(requestStatus)}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">ประเภทคำร้อง</dt>
            <dd className="mt-1 font-medium">{REQUEST_TYPE_LABELS[requestType]}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">ผู้สำรวจ</dt>
            <dd className="mt-1 font-medium">{request.assigned_surveyor ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">วันนัดสำรวจล่าสุด</dt>
            <dd className="mt-1 font-medium">{formatSurveyDate(currentSurveyDate)}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">ขั้นตอนถัดไป</dt>
            <dd className="mt-1 font-medium">{nextStepSummary.nextStep}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">ผู้ดำเนินการต่อ</dt>
            <dd className="mt-1 font-medium">{nextStepSummary.owner}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">โหมดตรวจเอกสาร</dt>
            <dd className="mt-1 font-medium">{documentReviewRules.mode === 'DETAILED' ? 'ละเอียด' : 'พื้นฐาน'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">วิธีที่อนุมัติให้ผ่านสุดท้าย</dt>
            <dd className="mt-1 font-medium">{getFinalApprovalSource(request)}</dd>
          </div>
        </dl>
      </section>

      {krabiDispatchWarning ? (
        <section className="card border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">แจ้งเตือนคิวส่งเอกสาร</p>
          <p className="mt-1 text-sm text-amber-700">{krabiDispatchWarning}</p>
        </section>
      ) : null}

      {requestType === 'METER' ? (
        <section className="card p-6">
          <h3 className="text-lg font-semibold">ข้อมูลนัดสำรวจ</h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm text-slate-500">วันนัดครั้งแรก</dt>
              <dd className="mt-1 font-medium">{formatSurveyDate(request.survey_date_initial)}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">วันนัดล่าสุด</dt>
              <dd className="mt-1 font-medium">{formatSurveyDate(currentSurveyDate)}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">วันเดิมก่อนเลื่อน</dt>
              <dd className="mt-1 font-medium">{formatSurveyDate(request.previous_survey_date)}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">สาเหตุการเลื่อน</dt>
              <dd className="mt-1 font-medium">{request.survey_reschedule_reason ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">ได้รับเอกสารจากลูกค้าเมื่อ</dt>
              <dd className="mt-1 font-medium">{formatDateTime(request.documents_received_at)}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">สถานะนัดสำรวจ</dt>
              <dd className="mt-1 font-medium">{surveySummary.label}</dd>
            </div>
          </dl>
          {customerDelaySummary ? <p className="mt-3 text-sm text-amber-700">{customerDelaySummary}</p> : null}
          {showRescheduleNotice ? (
            <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              งานนี้เลื่อนนัดสำรวจเนื่องจากรอเอกสารจากผู้ใช้ไฟ
            </p>
          ) : null}
          {needsRescheduleAfterDocuments(request) ? (
            <p className="mt-2 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-orange-800">
              เอกสารเพิ่งครบ รอนัดสำรวจใหม่
            </p>
          ) : null}
        </section>
      ) : null}

      {requestType === 'METER' ? (
        <section className="card p-6">
          <h3 className="text-lg font-semibold">สรุปผลหลังสำรวจ</h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm text-slate-500">ผลสำรวจล่าสุด</dt>
              <dd className="mt-1 font-medium">{postSurveyFixSummary.surveyResultLabel}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">รายการที่ต้องแก้</dt>
              <dd className="mt-1 font-medium">{postSurveyFixSummary.customerFixNote}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">วิธีตรวจหลังแก้ไข</dt>
              <dd className="mt-1 font-medium">{postSurveyFixSummary.fixVerificationModeLabel}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">ผู้ใช้ไฟแจ้งว่าแก้แล้วเมื่อ</dt>
              <dd className="mt-1 font-medium">{postSurveyFixSummary.customerFixReportedAt}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">สถานะการตรวจรูป</dt>
              <dd className="mt-1 font-medium">{postSurveyFixSummary.photoReviewStatusLabel}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">ผู้ตรวจรูป / เวลา</dt>
              <dd className="mt-1 font-medium">
                {postSurveyFixSummary.photoReviewedBy} / {postSurveyFixSummary.photoReviewedAt}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">วิธีที่อนุมัติให้ผ่านสุดท้าย</dt>
              <dd className="mt-1 font-medium">{postSurveyFixSummary.finalApprovalSourceLabel}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {requestType === 'METER' ? (
        <section className="card p-6">
          <h3 className="text-lg font-semibold">สรุปสถานะเอกสารหลังสำรวจ</h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm text-slate-500">สถานะเอกสาร</dt>
              <dd className="mt-1 font-medium">{documentSummary.documentStatusLabel}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">อนุญาตให้ดำเนินการต่อ</dt>
              <dd className="mt-1 font-medium">{documentSummary.collectDocsOnSiteLabel}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">หมายเหตุเอกสารขาด</dt>
              <dd className="mt-1 font-medium">{documentSummary.incompleteDocsNote ?? '-'}</dd>
            </div>
          </dl>

          {!canGoBilling && request.status === 'SURVEY_COMPLETED' ? (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">เคสรับเอกสารหน้างาน ยังต้องยืนยันเอกสารครบก่อน</p>
              <p className="mt-1 text-sm text-amber-700">ยังไม่สามารถไปสถานะรอออกใบแจ้งหนี้ได้จนกว่าจะกด “เอกสารครบแล้ว”</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {requestType === 'METER' ? (
        <section className="card p-6">
          <h3 className="text-lg font-semibold">ข้อมูลใบแจ้งหนี้งานขอมิเตอร์</h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm text-slate-500">จำนวนเงินใบแจ้งหนี้</dt>
              <dd className="mt-1 font-medium">{formatCurrency(request.billing_amount)}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">ออกใบแจ้งหนี้เมื่อ</dt>
              <dd className="mt-1 font-medium">{formatDateTime(request.billed_at)}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">ออกโดย</dt>
              <dd className="mt-1 font-medium">{request.billed_by ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">นักสำรวจเซ็นเมื่อ</dt>
              <dd className="mt-1 font-medium">{formatDateTime(request.invoice_signed_at)}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">ผู้เซ็น</dt>
              <dd className="mt-1 font-medium">{request.invoice_signed_by ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">ชำระเงินเมื่อ</dt>
              <dd className="mt-1 font-medium">{formatDateTime(request.paid_at)}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">รับชำระโดย</dt>
              <dd className="mt-1 font-medium">{request.paid_by ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">หมายเหตุใบแจ้งหนี้</dt>
              <dd className="mt-1 font-medium">{request.billing_note ?? '-'}</dd>
            </div>
          </dl>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">สรุปเงื่อนไขหลังแจ้งหนี้</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              <li>
                เซ็นใบแจ้งหนี้: {invoiceSigned ? 'เสร็จแล้ว' : 'ยังไม่เสร็จ'} {request.invoice_signed_by ? `(${request.invoice_signed_by})` : ''}
              </li>
              <li>
                ชำระเงิน: {paid ? 'เสร็จแล้ว' : 'ยังไม่เสร็จ'} {request.paid_by ? `(${request.paid_by})` : ''}
              </li>
            </ul>
            {readyForManager ? (
              <p className="mt-2 text-sm text-emerald-700">ครบทั้ง 2 เงื่อนไขแล้ว ระบบพร้อมส่งต่อผู้จัดการตรวจ</p>
            ) : (
              <p className="mt-2 text-sm text-amber-700">ยังต้องดำเนินการอีก {invoiceSigned ? '' : 'เซ็นใบแจ้งหนี้'}{!invoiceSigned && !paid ? ' และ ' : ''}{paid ? '' : 'ชำระเงิน'}</p>
            )}
          </div>
        </section>
      ) : null}

      <section className="card p-6">
        <h3 className="text-lg font-semibold">ตำแหน่ง</h3>
        {hasLocation ? (
          <>
            <p className="mt-2 text-sm text-slate-700">
              Latitude: {request.latitude!.toFixed(6)} | Longitude: {request.longitude!.toFixed(6)}
            </p>
            {request.location_note ? <p className="mt-1 text-sm text-slate-600">หมายเหตุจุดเพิ่มเติม: {request.location_note}</p> : null}
            {googleMapsUrl ? (
              <Link className="btn-secondary mt-3" href={googleMapsUrl} rel="noreferrer" target="_blank">
                เปิดใน Google Maps
              </Link>
            ) : null}
            <LocationPreview latitude={request.latitude!} longitude={request.longitude!} />
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">ยังไม่มีการปักหมุด</p>
        )}
      </section>

      <article className="card p-6">
        <h3 className="text-lg font-semibold">{getActionTitle(requestStatus, requestType)}</h3>
        <p className="mt-1 text-sm text-slate-500">ใช้ปุ่มตามหน้าที่ เพื่อกันการเปลี่ยนสถานะข้ามขั้นตอน</p>
        <div className="mt-4">
          {isUnifiedWorkflowStatus ? (
            <MeterWorkflowActions
              requestId={request.id}
              requestType={requestType}
              currentStatus={normalizedRequestStatus}
              fixVerificationMode={request.fix_verification_mode}
              scheduledSurveyDate={request.scheduled_survey_date}
              surveyDateCurrent={request.survey_date_current}
              isInvoiceSigned={invoiceSigned}
              isPaid={paid}
            />
          ) : null}
          {!isUnifiedWorkflowStatus && isSurveyorFlowStatus ? (
            <SurveyorActionWorkflow requestId={request.id} currentStatus={requestStatus} />
          ) : null}
          {!isUnifiedWorkflowStatus && !isSurveyorFlowStatus ? (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">สถานะนี้ยังไม่มี action เพิ่มเติม</p>
          ) : null}
        </div>
      </article>

      <section className="card p-6">
        <h3 className="text-lg font-semibold">ประวัติการดำเนินงาน</h3>
        <p className="mt-1 text-sm text-slate-500">เรียงตามลำดับเวลาเพื่อให้ติดตามงานได้ง่าย</p>
        <ol className="mt-4 space-y-3">
          {timeline.map((item) => (
            <li className="rounded-lg border border-slate-200 p-3" key={item.key}>
              <p className="text-sm font-semibold text-slate-800">{item.title}</p>
              {item.description ? <p className="mt-1 text-sm text-slate-600">{item.description}</p> : null}
              <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.at)}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
