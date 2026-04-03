import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MeterWorkflowActions } from '@/components/meter-workflow-actions';
import { SurveyorActionWorkflow } from '@/components/surveyor-action-workflow';
import {
  canStartSurvey,
  canMoveToBilling,
  canMoveToManagerReview,
  getCurrentSurveyDate,
  getCustomerDelaySummary,
  getDocumentStatusSummary,
  getRequestQueueGroup,
  getRequestQueueGroupLabel,
  getSurveyScheduleSummary,
  hasSurveyBeenRescheduled,
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
  if (requestType === 'METER') {
    switch (status) {
      case 'SURVEY_COMPLETED':
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
          nextStep: 'สำรวจให้เสร็จแล้วบันทึกผล',
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

  switch (status) {
    case 'PENDING_SURVEY_REVIEW':
      return {
        nextStep: 'นักสำรวจตรวจเอกสารและเลือกการดำเนินการ',
        owner: 'นักสำรวจ'
      };
    case 'SURVEY_ACCEPTED':
      return {
        nextStep: 'ลงพื้นที่สำรวจตามวันนัดหมาย หรือขอเลื่อนวันสำรวจ',
        owner: 'นักสำรวจ'
      };
    case 'SURVEY_DOCS_INCOMPLETE':
      return {
        nextStep: 'คนรับคำร้องติดตามเอกสารเพิ่มเติมจากลูกค้า',
        owner: 'เจ้าหน้าที่รับคำร้อง'
      };
    case 'SURVEY_RESCHEDULE_REQUESTED':
      return {
        nextStep: 'ยืนยันวันสำรวจใหม่และติดตามความพร้อมของลูกค้า',
        owner: 'เจ้าหน้าที่รับคำร้อง'
      };
    case 'SURVEY_COMPLETED':
      return {
        nextStep: 'สำรวจหน้างานเสร็จสิ้นแล้ว',
        owner: 'ทีมรับคำร้องดำเนินการขั้นตอนถัดไป'
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
      title: 'สำรวจหน้างานเสร็จ',
      at: request.survey_completed_at
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
      'SURVEY_COMPLETED',
      'WAIT_DOCUMENT_REVIEW',
      'WAIT_DOCUMENT_FROM_CUSTOMER',
      'READY_FOR_SURVEY',
      'IN_SURVEY',
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
      'id,request_no,customer_name,phone,request_type,area_name,assignee_id,assignee_name,assigned_surveyor,scheduled_survey_date,survey_date_initial,survey_date_current,previous_survey_date,survey_rescheduled_at,survey_reschedule_reason,documents_received_at,awaiting_customer_documents_since,status,survey_note,survey_reschedule_date,survey_reviewed_at,survey_completed_at,document_status,collect_docs_on_site,incomplete_docs_note,billing_amount,billing_note,billed_at,billed_by,invoice_signed_at,invoice_signed_by,paid_at,paid_by,created_at,updated_at'
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
  const currentQueue = getRequestQueueGroup(requestStatus);
  const isSurveyorFlowStatus = currentQueue === 'SURVEY';
  const isMeterLoopStatus =
    requestType === 'METER' &&
    [
      'SURVEY_COMPLETED',
      'WAIT_DOCUMENT_REVIEW',
      'WAIT_DOCUMENT_FROM_CUSTOMER',
      'READY_FOR_SURVEY',
      'IN_SURVEY',
      'WAIT_BILLING',
      'WAIT_ACTION_CONFIRMATION',
      'WAIT_MANAGER_REVIEW'
    ].includes(requestStatus);
  const documentSummary = getDocumentStatusSummary(request);
  const invoiceSigned = isInvoiceSigned(request);
  const paid = isPaid(request);
  const canGoBilling = canMoveToBilling(request);
  const readyForManager = canMoveToManagerReview(request);
  const nextStepSummary = getNextStepSummary(requestStatus, requestType);
  const currentSurveyDate = getCurrentSurveyDate(request);
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
    awaiting_customer_documents_since: request.awaiting_customer_documents_since
  });

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
        </dl>
      </section>

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

      <article className="card p-6">
        <h3 className="text-lg font-semibold">{getActionTitle(requestStatus, requestType)}</h3>
        <p className="mt-1 text-sm text-slate-500">ใช้ปุ่มตามหน้าที่ เพื่อกันการเปลี่ยนสถานะข้ามขั้นตอน</p>
        <div className="mt-4">
          {isMeterLoopStatus ? (
            <MeterWorkflowActions
              requestId={request.id}
              currentStatus={requestStatus}
              isInvoiceSigned={invoiceSigned}
              isPaid={paid}
              collectDocsOnSite={request.collect_docs_on_site}
              hasCurrentSurveyDate={canStartSurvey(request)}
            />
          ) : null}
          {!isMeterLoopStatus && isSurveyorFlowStatus ? (
            <SurveyorActionWorkflow requestId={request.id} currentStatus={requestStatus} />
          ) : null}
          {!isMeterLoopStatus && !isSurveyorFlowStatus ? (
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
