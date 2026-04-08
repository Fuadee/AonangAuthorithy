import Link from 'next/link';
import RequestPhoneAction from '@/components/request-phone-action';
import { notFound } from 'next/navigation';
import { LocationPreview } from '@/components/location-preview';
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
  getResponsiblePersonName,
  getSurveyScheduleSummary,
  hasSurveyBeenRescheduled,
  normalizeSurveyWorkflowStatus,
  getRequestStatusLabel,
  isInvoiceSigned,
  needsRescheduleAfterDocuments,
  isPaid,
  isExpansionWorkflowStatus,
  REQUEST_TYPE_LABELS,
  RequestStatus,
  RequestType,
  ThreePhaseCapabilityResult
} from '@/lib/requests/types';
import { buildFullAddress } from '@/lib/requests/address';
import { formatDateOnly, formatThaiDateTime, formatThaiTimelineDate, safeParseDate } from '@/lib/datetime';
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
  sortAt: number;
};

function formatSurveyDate(value: string | null): string {
  return formatDateOnly(value);
}

function formatDateTime(value: string | null): string {
  return formatThaiDateTime(value);
}

function resolveTimelineSortAt(value: string): number {
  const parsed = safeParseDate(value);
  return parsed ? parsed.getTime() : 0;
}

function getRequestTypeBadgeClass(requestType: RequestType): string {
  const normalizedRequestType = requestType as string;
  if (normalizedRequestType === 'METER') {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }
  if (normalizedRequestType === 'METER_30_100_1P') {
    return 'border-sky-200 bg-sky-50 text-sky-700';
  }
  if (normalizedRequestType === 'METER_30_100_3P') {
    return 'border-indigo-200 bg-indigo-50 text-indigo-700';
  }
  if (normalizedRequestType === 'METER_TO_3PHASE') {
    return 'border-violet-200 bg-violet-50 text-violet-700';
  }
  if (normalizedRequestType === 'EXPANSION') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  return 'border-slate-200 bg-slate-100 text-slate-700';
}

function getNextStepSummary(
  status: RequestStatus,
  requestType: RequestType,
  threePhaseCapabilityResult: ThreePhaseCapabilityResult | null
): { nextStep: string; owner: string } {
  const normalizedStatus = normalizeSurveyWorkflowStatus(status);

  if (requestType === 'METER_30_100_1P' || requestType === 'METER_30_100_3P') {
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
      case 'CHECK_3PHASE_CAPABILITY':
        if (requestType === 'METER_30_100_3P' && threePhaseCapabilityResult !== 'SUPPORTED') {
          return {
            nextStep: 'ตรวจว่า “ระบบรองรับ 3 เฟส” ก่อน แล้วจึงเลือกผลสำรวจผ่าน/ไม่ผ่านต่อทันที',
            owner: 'นักสำรวจ'
          };
        }
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
      case 'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL':
        return {
          nextStep: 'รอผู้จัดการอ่าวนางอนุมัติก่อนส่งเอกสารไปกระบี่',
          owner: 'ผู้จัดการอ่าวนาง'
        };
      case 'SENT_TO_KRABI':
      case 'WAIT_KRABI_APPROVAL':
        return {
          nextStep: 'รอผลพิจารณาจากกระบี่ (อนุมัติหรือส่งกลับแก้ไขเอกสาร)',
          owner: 'ทีมกระบี่'
        };
      case 'KRABI_NEEDS_CORRECTION':
      case 'DOCUMENT_FIX':
      case 'RESENT_TO_KRABI':
        return {
          nextStep: 'แก้ไขเอกสารและส่งกระบี่ใหม่จนกว่าจะอนุมัติ',
          owner: 'ทีมเอกสาร'
        };
      case 'KRABI_APPROVED':
        return {
          nextStep: 'ทีมเอกสารยืนยันรับเอกสารกลับจากกระบี่ แล้วงานจะถูกส่งเข้าคิวตรวจสอบสิทธิ์ทันที',
          owner: 'ทีมเอกสาร'
        };
      case 'WAIT_RECEIVE_FROM_KRABI':
      case 'WAIT_ELIGIBILITY_REVIEW':
        return {
          nextStep: 'บันทึกผลตรวจสอบสิทธิ์ (ผ่าน = ส่งผู้จัดการอนุมัติ, ไม่ผ่าน = ไปออกใบแจ้งหนี้)',
          owner: 'การเงิน'
        };
      case 'WAIT_BILLING':
        return {
          nextStep: 'เจ้าหน้าที่ออกใบแจ้งหนี้และบันทึกผู้ดำเนินการ',
          owner: 'การเงิน'
        };
      case 'WAIT_PAYMENT':
        return {
          nextStep: 'รอบันทึกชำระเงิน จากนั้นส่งให้ผู้จัดการอ่าวนางอนุมัติรอบสุดท้าย',
          owner: 'การเงิน'
        };
      case 'WAIT_AONANG_MANAGER_FINAL_APPROVAL':
      case 'WAIT_MANAGER_REVIEW':
        return {
          nextStep: 'ผู้จัดการอ่าวนางอนุมัติรอบสุดท้ายก่อนปิดงาน',
          owner: 'ผู้จัดการอ่าวนาง'
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

  if (requestType === 'METER_TO_3PHASE') {
    switch (normalizedStatus) {
      case 'WAIT_DOCUMENT_REVIEW':
        return { nextStep: 'ตรวจเอกสารก่อนเริ่มสำรวจ', owner: 'เจ้าหน้าที่รับคำร้อง' };
      case 'WAIT_DOCUMENT_FROM_CUSTOMER':
        return { nextStep: 'รอลูกค้านำเอกสารให้ครบแล้วกดยืนยันรับเอกสาร', owner: 'เจ้าหน้าที่รับคำร้อง' };
      case 'READY_FOR_SURVEY':
        return { nextStep: 'รับงานและลงสำรวจหน้างาน', owner: 'นักสำรวจ' };
      case 'IN_SURVEY':
      case 'CHECK_3PHASE_CAPABILITY':
        if (threePhaseCapabilityResult === 'SUPPORTED') {
          return { nextStep: 'เข้าสู่ flow สำรวจแบบงานขอมิเตอร์แล้ว ให้ตัดสินใจผลสำรวจว่า “ผ่าน” หรือ “ไม่ผ่าน”', owner: 'นักสำรวจ' };
        }
        return { nextStep: 'ตัดสินใจว่าระบบรองรับ 3 เฟสหรือไม่', owner: 'นักสำรวจ' };
      case 'WAIT_BILLING':
        return { nextStep: 'ผลสำรวจผ่านแล้ว รอออกใบแจ้งหนี้เหมือนงานขอมิเตอร์', owner: 'การเงิน' };
      case 'WAIT_ACTION_CONFIRMATION':
        return { nextStep: 'บันทึก “เซ็นใบแจ้งหนี้” และ “ชำระเงิน” ให้ครบทั้งสองรายการ', owner: 'นักสำรวจ / การเงิน' };
      case 'WAIT_MANAGER_REVIEW':
        return { nextStep: 'ผู้จัดการตรวจเอกสารและอนุมัติปิดงาน', owner: 'ผู้จัดการ' };
      case 'COMPLETED':
        return { nextStep: 'ปิดงานเรียบร้อยแล้ว', owner: 'เสร็จสิ้น' };
      case 'WAIT_CUSTOMER_FIX':
      case 'WAIT_FIX_REVIEW':
      case 'READY_FOR_RESURVEY':
        return { nextStep: 'อยู่ใน flow แก้ไข/ตรวจซ้ำแบบเดียวกับงานขอมิเตอร์', owner: 'นักสำรวจ / เจ้าหน้าที่' };
      case 'WAIT_LAYOUT_DRAWING':
        return { nextStep: 'ดำเนินการต่อในขั้นตอนรอวาดผัง (flow ขยายเขต)', owner: 'ทีมเอกสารขยายเขต' };
      default:
        if (isExpansionWorkflowStatus(normalizedStatus)) {
          return getNextStepSummary(normalizedStatus, 'EXPANSION', null);
        }
        return { nextStep: 'ติดตามความคืบหน้าตามสถานะปัจจุบัน', owner: 'ทีมปฏิบัติการ' };
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
    case 'WAITING_TO_SEND_TO_KRABI':
      return {
        nextStep: 'พร้อมจัดส่งเอกสารให้กระบี่',
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
        nextStep: 'แก้ไขเอกสารตามเหตุผลที่กระบี่ตีกลับ แล้วส่งเอกสารใหม่เข้าคิวกระบี่',
        owner: 'ฝ่ายเอกสาร / ผู้จัดเตรียมเอกสาร'
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
        nextStep: 'ยืนยันว่า ผกส.รับเรื่องแล้ว เพื่อจบ flow ฝั่งกระบี่',
        owner: 'เจ้าหน้าที่'
      };
    case 'COORDINATED_WITH_CONSTRUCTION':
      return {
        nextStep: 'จบขั้นตอนฝั่งกระบี่แล้ว และ ผกส.รับเรื่องเรียบร้อย',
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
  is_document_ready: boolean;
  document_prepared_at: string | null;
  planned_dispatch_date: string | null;
  dispatched_to_krabi_at: string | null;
  dispatched_to_krabi_by: string | null;
  krabi_in_progress_at: string | null;
  krabi_completed_at: string | null;
  reject_reason: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  forwarded_to_expansion_at: string | null;
  forwarded_to_expansion_note: string | null;
  three_phase_capability_result: ThreePhaseCapabilityResult | null;
  three_phase_capability_checked_at: string | null;
}): TimelineItem[] {
  const items: TimelineItem[] = [
    {
      key: 'created',
      title: 'สร้างคำร้อง',
      at: request.created_at,
      sortAt: resolveTimelineSortAt(request.created_at)
    }
  ];

  if (request.survey_reviewed_at) {
    items.push({
      key: 'reviewed',
      title: 'ตรวจเอกสารล่าสุด',
      description: request.survey_note ? `หมายเหตุ: ${request.survey_note}` : undefined,
      at: request.survey_reviewed_at,
      sortAt: resolveTimelineSortAt(request.survey_reviewed_at)
    });
  }

  if (request.survey_reschedule_date) {
    items.push({
      key: 'rescheduled',
      title: 'ขอเลื่อนวันสำรวจ',
      description: `วันสำรวจใหม่: ${formatSurveyDate(request.survey_reschedule_date)}`,
      at: `${request.survey_reschedule_date}T00:00:00.000Z`,
      sortAt: resolveTimelineSortAt(`${request.survey_reschedule_date}T00:00:00.000Z`)
    });
  }

  if (request.survey_date_initial) {
    items.push({
      key: 'survey-initial',
      title: 'นัดสำรวจครั้งแรก',
      description: `วันนัด: ${formatSurveyDate(request.survey_date_initial)}`,
      at: `${request.survey_date_initial}T00:00:00.000Z`,
      sortAt: resolveTimelineSortAt(`${request.survey_date_initial}T00:00:00.000Z`)
    });
  }

  if (request.awaiting_customer_documents_since) {
    items.push({
      key: 'awaiting-customer-docs',
      title: 'เอกสารไม่ครบ / รอผู้ใช้ไฟนำเอกสารมาให้',
      at: request.awaiting_customer_documents_since,
      sortAt: resolveTimelineSortAt(request.awaiting_customer_documents_since)
    });
  }

  if (request.documents_received_at) {
    items.push({
      key: 'documents-received',
      title: 'ได้รับเอกสารจากลูกค้า',
      at: request.documents_received_at,
      sortAt: resolveTimelineSortAt(request.documents_received_at)
    });
  }

  if (request.three_phase_capability_checked_at && request.three_phase_capability_result === 'SUPPORTED') {
    items.push({
      key: 'three-phase-capability-supported',
      title: 'ตรวจสอบแล้วระบบรองรับ 3 เฟส',
      at: request.three_phase_capability_checked_at,
      sortAt: resolveTimelineSortAt(request.three_phase_capability_checked_at)
    });
  }

  if (request.survey_rescheduled_at && request.survey_date_current) {
    items.push({
      key: 'rescheduled-latest',
      title: 'นัดสำรวจใหม่',
      description: `${formatSurveyDate(request.survey_date_current)}${request.survey_reschedule_reason ? ` | เหตุผล: ${request.survey_reschedule_reason}` : ''}`,
      at: request.survey_rescheduled_at,
      sortAt: resolveTimelineSortAt(request.survey_rescheduled_at)
    });
  }

  if (request.survey_completed_at) {
    items.push({
      key: 'completed',
      title: request.survey_result === 'FAIL' ? 'สำรวจไม่ผ่าน' : 'สำรวจหน้างานเสร็จ',
      description:
        request.survey_result === 'PASS'
          ? 'ผลสำรวจผ่าน เข้าสู่ขั้นตอนรอผู้จัดการอ่าวนางอนุมัติก่อนส่งกระบี่'
          : request.customer_fix_note
            ? `ผลสำรวจไม่ผ่าน เข้าสู่ขั้นตอนแก้ไข/ตรวจซ้ำ | รายการที่ต้องแก้: ${request.customer_fix_note}`
            : 'ผลสำรวจไม่ผ่าน เข้าสู่ขั้นตอนแก้ไข/ตรวจซ้ำ',
      at: request.survey_completed_at,
      sortAt: resolveTimelineSortAt(request.survey_completed_at)
    });
  }

  if (request.document_prepared_at) {
    items.push({
      key: 'document-prepared',
      title: 'เอกสารพร้อมจัดส่ง',
      description: request.planned_dispatch_date ? `รอบส่ง: ${formatSurveyDate(request.planned_dispatch_date)}` : undefined,
      at: request.document_prepared_at,
      sortAt: resolveTimelineSortAt(request.document_prepared_at)
    });
  }

  if (request.dispatched_to_krabi_at) {
    items.push({
      key: 'sent-to-krabi',
      title: 'ส่งเอกสารไปกระบี่แล้ว',
      description: request.dispatched_to_krabi_by ? `ผู้ส่ง: ${request.dispatched_to_krabi_by}` : undefined,
      at: request.dispatched_to_krabi_at,
      sortAt: resolveTimelineSortAt(request.dispatched_to_krabi_at)
    });
  }

  if (request.rejected_at) {
    items.push({
      key: 'krabi-returned-for-fix',
      title: 'กระบี่ตีกลับให้แก้ไขเอกสาร',
      description: request.reject_reason ? `เหตุผล: ${request.reject_reason}` : undefined,
      at: request.rejected_at,
      sortAt: resolveTimelineSortAt(request.rejected_at)
    });
  }

  if (request.forwarded_to_expansion_at) {
    items.push({
      key: 'forwarded-to-expansion',
      title: 'ส่งต่องานเข้าสู่ flow ขยายเขต',
      description: request.forwarded_to_expansion_note ?? 'ระบบไม่รองรับ 3 เฟส จึงส่งต่อเข้าขยายเขตที่ WAIT_LAYOUT_DRAWING',
      at: request.forwarded_to_expansion_at,
      sortAt: resolveTimelineSortAt(request.forwarded_to_expansion_at)
    });
  }

  if (request.krabi_in_progress_at) {
    items.push({
      key: 'krabi-in-progress',
      title: 'กระบี่รับดำเนินการ / กำลังประมาณการ',
      at: request.krabi_in_progress_at,
      sortAt: resolveTimelineSortAt(request.krabi_in_progress_at)
    });
  }

  if (request.krabi_completed_at) {
    items.push({
      key: 'krabi-completed',
      title: 'กระบี่ประมาณการเสร็จแล้ว',
      at: request.krabi_completed_at,
      sortAt: resolveTimelineSortAt(request.krabi_completed_at)
    });
  }

  if (request.customer_fix_reported_at) {
    items.push({
      key: 'customer-fix-reported',
      title: 'ผู้ใช้ไฟแจ้งว่าแก้ไขแล้ว / ส่งรูปแล้ว',
      at: request.customer_fix_reported_at,
      sortAt: resolveTimelineSortAt(request.customer_fix_reported_at)
    });
  }

  if (request.photo_review_status && request.photo_reviewed_at) {
    items.push({
      key: 'photo-review',
      title: request.photo_review_status === 'APPROVED' ? 'ตรวจรูปแล้วผ่าน' : 'ตรวจรูปแล้วต้องลงพื้นที่ตรวจซ้ำ',
      description: request.photo_reviewed_by ? `ผู้ตรวจ: ${request.photo_reviewed_by}` : undefined,
      at: request.photo_reviewed_at,
      sortAt: resolveTimelineSortAt(request.photo_reviewed_at)
    });
  }

  if (request.collect_docs_on_site) {
    items.push({
      key: 'collect-docs-on-site',
      title: 'กำหนดเป็นเคสรับเอกสารหน้างาน',
      description: 'สามารถรับงานและไปสำรวจได้ แต่ต้องยืนยันเอกสารครบหลังสำรวจ',
      at: request.updated_at,
      sortAt: resolveTimelineSortAt(request.updated_at)
    });
  }

  if (request.billed_at) {
    const detail: string[] = [];
    if (request.billed_by) {
      detail.push(`ออกโดย: ${request.billed_by}`);
    }
    if (request.billing_note) {
      detail.push(`หมายเหตุ: ${request.billing_note}`);
    }

    items.push({
      key: 'billed',
      title: 'ออกใบแจ้งหนี้แล้ว',
      description: detail.length ? detail.join(' | ') : undefined,
      at: request.billed_at,
      sortAt: resolveTimelineSortAt(request.billed_at)
    });
  }

  if (request.invoice_signed_at) {
    items.push({
      key: 'surveyor-signed',
      title: 'นักสำรวจเซ็นรับรองใบแจ้งหนี้',
      description: request.invoice_signed_by ? `ผู้เซ็น: ${request.invoice_signed_by}` : undefined,
      at: request.invoice_signed_at,
      sortAt: resolveTimelineSortAt(request.invoice_signed_at)
    });
  }

  if (request.paid_at) {
    items.push({
      key: 'paid',
      title: 'ยืนยันชำระเงินแล้ว',
      description: request.paid_by ? `ยืนยันโดย: ${request.paid_by}` : undefined,
      at: request.paid_at,
      sortAt: resolveTimelineSortAt(request.paid_at)
    });
  }

  if (request.updated_at !== request.created_at) {
    items.push({
      key: 'updated',
      title: 'อัปเดตข้อมูลล่าสุด',
      description: `สถานะล่าสุด: ${getRequestStatusLabel(request.status)}`,
      at: request.updated_at,
      sortAt: resolveTimelineSortAt(request.updated_at)
    });
  }

  return items.sort((a, b) => b.sortAt - a.sortAt);
}

export default async function RequestDetailPage({ params }: RequestDetailPageProps) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select(
      'id,request_no,customer_name,phone,request_type,area_name,assignee_id,assignee_name,assigned_surveyor_id,assigned_surveyor,scheduled_survey_date,survey_date_initial,survey_date_current,previous_survey_date,survey_rescheduled_at,survey_reschedule_reason,documents_received_at,awaiting_customer_documents_since,status,survey_note,survey_reschedule_date,survey_reviewed_at,survey_completed_at,survey_result,fix_verification_mode,customer_fix_note,customer_fix_reported_at,photo_review_status,photo_reviewed_at,photo_reviewed_by,fix_approved_via,document_status,collect_docs_on_site,incomplete_docs_note,reject_reason,rejected_by,rejected_at,billing_amount,billing_note,billed_at,billed_by,invoice_signed_at,invoice_signed_by,paid_at,paid_by,is_document_ready,document_prepared_at,planned_dispatch_date,dispatched_to_krabi_at,dispatched_to_krabi_by,krabi_received_at,krabi_in_progress_at,krabi_completed_at,forwarded_to_expansion_at,forwarded_to_expansion_note,three_phase_capability_result,three_phase_capability_checked_at,house_number,village_no,road,landmark,latitude,longitude,location_note,created_at,updated_at'
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
  const requestType = request.request_type as RequestType;
  const requestTypeLabel = REQUEST_TYPE_LABELS[requestType];
  const currentQueue = getRequestQueueGroup(requestStatus);
  const documentSummary = getDocumentStatusSummary(request);
  const postSurveyFixSummary = getPostSurveyFixSummary(request);
  const invoiceSigned = isInvoiceSigned(request);
  const paid = isPaid(request);
  const canGoBilling = canMoveToBilling(request);
  const readyForManager = canMoveToManagerReview(request);
  const nextStepSummary = getNextStepSummary(requestStatus, requestType, request.three_phase_capability_result);
  const documentReviewRules = getDocumentReviewRules(requestType);
  const currentSurveyDate = getCurrentSurveyDate(request);
  const responsiblePersonName = getResponsiblePersonName(request);
  const hasLocation = request.latitude !== null && request.longitude !== null;
  const googleMapsUrl = hasLocation
    ? `https://www.google.com/maps?q=${request.latitude},${request.longitude}`
    : null;
  const surveySummary = getSurveyScheduleSummary(request);
  const fullAddress = buildFullAddress(request);
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
    is_document_ready: request.is_document_ready,
    document_prepared_at: request.document_prepared_at,
    planned_dispatch_date: request.planned_dispatch_date,
    dispatched_to_krabi_at: request.dispatched_to_krabi_at,
    dispatched_to_krabi_by: request.dispatched_to_krabi_by,
    krabi_in_progress_at: request.krabi_in_progress_at,
    krabi_completed_at: request.krabi_completed_at,
    reject_reason: request.reject_reason,
    rejected_by: request.rejected_by,
    rejected_at: request.rejected_at
    ,
    forwarded_to_expansion_at: request.forwarded_to_expansion_at,
    forwarded_to_expansion_note: request.forwarded_to_expansion_note,
    three_phase_capability_result: request.three_phase_capability_result,
    three_phase_capability_checked_at: request.three_phase_capability_checked_at
  });
  const krabiDispatchWarning = getKrabiDispatchWarning(request);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">รายละเอียดคำร้อง</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{requestTypeLabel}</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">{request.request_no}</p>
        </div>
        <Link className="btn-secondary" href="/dashboard">
          กลับไป Dashboard
        </Link>
      </div>

      <section className="card p-6">
        <h3 className="text-lg font-semibold">ข้อมูลผู้ยื่นคำร้อง</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">ชื่อลูกค้า</dt>
            <dd className="mt-1 font-medium">{request.customer_name}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">โทรศัพท์</dt>
            <dd className="mt-1">
              <RequestPhoneAction phone={request.phone} />
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-slate-500">ที่อยู่</dt>
            <dd className="mt-1 font-medium">{fullAddress}</dd>
          </div>
        </dl>
        {requestStatus === 'KRABI_NEEDS_DOCUMENT_FIX' ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-semibold text-rose-800">เหตุผลที่ตีกลับ</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-rose-900">{request.reject_reason ?? '-'}</p>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-rose-700">ผู้ตีกลับ</dt>
                <dd className="mt-1 text-sm font-medium text-rose-900">{request.rejected_by ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-rose-700">เวลาที่ตีกลับ</dt>
                <dd className="mt-1 text-sm font-medium text-rose-900">{formatDateTime(request.rejected_at)}</dd>
              </div>
            </dl>
          </div>
        ) : null}
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
            <dd className="mt-1 font-medium">{requestTypeLabel}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">ผู้รับผิดชอบ</dt>
            <dd className="mt-1 font-medium">{responsiblePersonName}</dd>
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

      {['METER', 'METER_30_100_1P', 'METER_30_100_3P'].includes(requestType) ? (
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

      {['METER', 'METER_30_100_1P', 'METER_30_100_3P'].includes(requestType) ? (
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

      {['METER', 'METER_30_100_1P', 'METER_30_100_3P'].includes(requestType) ? (
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

      {['METER', 'METER_30_100_1P', 'METER_30_100_3P'].includes(requestType) ? (
        <section className="card p-6">
          <h3 className="text-lg font-semibold">ข้อมูลใบแจ้งหนี้งานขอมิเตอร์</h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <p className="mt-2 text-sm text-slate-700">ที่อยู่: {fullAddress}</p>
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

      <section className="card p-6">
        <h3 className="text-lg font-semibold">ประวัติการดำเนินงาน</h3>
        <p className="mt-1 text-sm text-slate-500">เรียงตามลำดับเวลาเพื่อให้ติดตามงานได้ง่าย</p>
        <ol className="mt-4 space-y-3">
          {timeline.map((item) => (
            <li className="rounded-lg border border-slate-200 p-3" key={item.key}>
              <p className="text-sm font-semibold text-slate-800">{item.title}</p>
              {item.description ? <p className="mt-1 text-sm text-slate-600">{item.description}</p> : null}
              <p className="mt-1 text-xs text-slate-500">{formatThaiTimelineDate(item.at)}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
