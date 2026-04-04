'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { generateRequestNo } from '@/lib/requests/generateRequestNo';
import { isAreaCode } from '@/lib/requests/areas';
import {
  canApproveFixFromPhoto,
  canMarkSurveyFailed,
  canMarkSurveyPassed,
  canMoveToBilling,
  canStartSurvey,
  canMoveToManagerReview,
  DocumentReviewDecision,
  normalizeSurveyWorkflowStatus,
  REQUEST_STATUSES,
  RequestStatus,
  REQUEST_TYPES,
  RequestType,
  resolveDocumentReviewDecision,
  resolvePostBillingPhase
} from '@/lib/requests/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function requiredField(formData: FormData, key: string): string {
  const value = formData.get(key)?.toString().trim();
  if (!value) {
    throw new Error(`Missing required field: ${key}`);
  }

  return value;
}

function getEffectiveSurveyDate(request: { survey_date_current?: string | null; scheduled_survey_date?: string | null }): string | null {
  return request.survey_date_current ?? request.scheduled_survey_date ?? null;
}

function optionalField(formData: FormData, key: string): string | null {
  const value = formData.get(key)?.toString().trim();
  return value ? value : null;
}

function parseOptionalCoordinate(formData: FormData, key: 'latitude' | 'longitude'): number | null {
  const raw = formData.get(key)?.toString().trim();
  if (!raw) {
    return null;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`รูปแบบพิกัด ${key} ไม่ถูกต้อง`);
  }

  return value;
}

function isValidDateOnly(dateText: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateText) && !Number.isNaN(new Date(`${dateText}T00:00:00.000Z`).valueOf());
}

function isValidRequestStatus(status: string): status is RequestStatus {
  return REQUEST_STATUSES.includes(status as RequestStatus);
}

function parseBillingAmount(value: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('จำนวนเงินใบแจ้งหนี้ต้องมากกว่า 0');
  }

  return Number(amount.toFixed(2));
}

function assertMeterLoopAllowed(requestType: RequestType): void {
  if (requestType !== 'METER') {
    throw new Error('รองรับ workflow ออกใบแจ้งหนี้เฉพาะคำร้องขอมิเตอร์เท่านั้น');
  }
}

function revalidateRequestPaths(requestId: string): void {
  revalidatePath('/dashboard');
  revalidatePath('/surveyor');
  revalidatePath('/billing');
  revalidatePath('/manager');
  revalidatePath(`/requests/${requestId}`);
}

const ALLOWED_STATUS_TRANSITIONS: Partial<Record<RequestStatus, RequestStatus[]>> = {
  WAIT_LAYOUT_DRAWING: ['READY_TO_SEND_KRABI'],
  WAIT_ACTION_CONFIRMATION: ['WAIT_MANAGER_REVIEW'],
  WAIT_MANAGER_REVIEW: ['COMPLETED']
};

export async function createRequestAction(formData: FormData) {
  const customerName = requiredField(formData, 'customer_name');
  const phone = requiredField(formData, 'phone');
  const areaCode = requiredField(formData, 'area_code');
  const assigneeId = requiredField(formData, 'assignee_id');
  const requestType = requiredField(formData, 'request_type');
  const assignedSurveyor = optionalField(formData, 'assigned_surveyor');
  const scheduledSurveyDate = optionalField(formData, 'scheduled_survey_date');
  const latitude = parseOptionalCoordinate(formData, 'latitude');
  const longitude = parseOptionalCoordinate(formData, 'longitude');
  const locationNote = optionalField(formData, 'location_note');

  if (!REQUEST_TYPES.includes(requestType as (typeof REQUEST_TYPES)[number])) {
    throw new Error('Invalid request type');
  }

  if ((assignedSurveyor && !scheduledSurveyDate) || (!assignedSurveyor && scheduledSurveyDate)) {
    throw new Error('กรุณาระบุผู้สำรวจและวันสำรวจให้ครบทั้งคู่');
  }

  if (scheduledSurveyDate && !isValidDateOnly(scheduledSurveyDate)) {
    throw new Error('รูปแบบวันสำรวจไม่ถูกต้อง');
  }

  if ((latitude === null) !== (longitude === null)) {
    throw new Error('กรุณาระบุพิกัด latitude และ longitude ให้ครบทั้งคู่');
  }

  if (latitude === null || longitude === null) {
    throw new Error('กรุณาปักหมุดตำแหน่งก่อนบันทึกคำร้อง');
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error('ค่าพิกัดไม่ถูกต้อง');
  }

  const supabase = createServerSupabaseClient();

  if (!isAreaCode(areaCode)) {
    throw new Error('Invalid area code');
  }

  const [{ data: area, error: areaError }, { data: assignee, error: assigneeError }] = await Promise.all([
    supabase.from('areas').select('id,code,name').eq('code', areaCode).single(),
    supabase
      .from('assignees')
      .select('id,code,name,is_active')
      .eq('id', assigneeId)
      .eq('is_active', true)
      .single()
  ]);

  if (areaError || !area) {
    throw new Error(areaError?.message ?? 'Area not found');
  }

  if (assigneeError || !assignee) {
    throw new Error(assigneeError?.message ?? 'Assignee not found');
  }

  const requestNo = await generateRequestNo();

  const initialStatus: RequestStatus = 'WAIT_DOCUMENT_REVIEW';

  const { error: insertError } = await supabase.from('service_requests').insert({
    request_no: requestNo,
    customer_name: customerName,
    phone,
    area_id: area.id,
    area_code: area.code,
    area_name: area.name,
    assignee_id: assignee.id,
    assignee_code: assignee.code,
    assignee_name: assignee.name,
    assigned_surveyor: assignedSurveyor,
    scheduled_survey_date: scheduledSurveyDate,
    survey_date_initial: scheduledSurveyDate,
    survey_date_current: scheduledSurveyDate,
    status: initialStatus,
    request_type: requestType,
    latitude,
    longitude,
    location_note: locationNote,
    collect_docs_on_site: false
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  revalidatePath('/dashboard');
  revalidatePath('/surveyor');
  redirect('/dashboard');
}

export async function updateRequestStatusAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const nextStatus = requiredField(formData, 'status');

  if (!isValidRequestStatus(nextStatus)) {
    throw new Error('Invalid status');
  }

  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,invoice_signed_at,paid_at,request_type,collect_docs_on_site,document_status,fix_verification_mode')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if (!isValidRequestStatus(request.status)) {
    throw new Error('สถานะปัจจุบันไม่ถูกต้อง');
  }

  const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[request.status];
  if (allowedTransitions && !allowedTransitions.includes(nextStatus)) {
    throw new Error('ไม่สามารถข้ามสถานะได้');
  }

  if (request.status === 'WAIT_DOCUMENT_REVIEW' && nextStatus === 'WAIT_BILLING') {
    throw new Error('ห้ามเปลี่ยนเป็นรอออกใบแจ้งหนี้โดยตรง ต้องผ่านการสำรวจก่อน');
  }
  if (request.status === 'WAIT_CUSTOMER_FIX' && nextStatus === 'WAIT_BILLING') {
    throw new Error('ห้ามข้ามจากรอผู้ใช้ไฟแก้ไขไปออกใบแจ้งหนี้โดยตรง');
  }
  if (request.status === 'WAIT_FIX_REVIEW' && nextStatus === 'WAIT_BILLING') {
    throw new Error('ห้ามข้ามจากรอตรวจรูปไปออกใบแจ้งหนี้โดยตรง');
  }

  if (request.status === 'WAIT_BILLING' && (nextStatus === 'WAIT_MANAGER_REVIEW' || nextStatus === 'COMPLETED')) {
    throw new Error('ห้ามข้ามจากรอออกใบแจ้งหนี้ไปสถานะปลายทางโดยตรง');
  }

  if (request.status === 'WAIT_ACTION_CONFIRMATION' && nextStatus === 'COMPLETED') {
    throw new Error('ต้องผ่านการตรวจของผู้จัดการก่อนปิดงาน');
  }

  if (request.request_type === 'METER' && request.status === 'WAIT_DOCUMENT_FROM_CUSTOMER' && nextStatus === 'READY_FOR_SURVEY') {
    throw new Error('ต้องกด action “ได้รับเอกสารแล้ว” เพื่อยืนยันเอกสารครบก่อนรับงาน');
  }

  if (request.request_type === 'METER' && request.status === 'SURVEY_COMPLETED' && nextStatus === 'WAIT_BILLING') {
    if (!canMoveToBilling(request)) {
      throw new Error('เคสรับเอกสารหน้างาน ต้องยืนยันว่าเอกสารครบแล้วก่อนออกใบแจ้งหนี้');
    }
  }

  if (request.request_type === 'METER' && ['WAIT_LAYOUT_DRAWING', 'READY_TO_SEND_KRABI'].includes(nextStatus)) {
    throw new Error('สถานะวาดผังรองรับเฉพาะงานขยายเขตเท่านั้น');
  }

  if (request.request_type === 'EXPANSION' && nextStatus === 'WAIT_BILLING') {
    throw new Error('งานขยายเขตต้องไปขั้นวาดผังก่อน และค้างที่เตรียมส่งเอกสารให้กระบี่');
  }

  if (request.request_type === 'EXPANSION' && request.status === 'SURVEY_COMPLETED' && !['WAIT_LAYOUT_DRAWING', 'READY_TO_SEND_KRABI'].includes(nextStatus)) {
    throw new Error('งานขยายเขตหลังสำรวจต้องไปขั้นรอวาดผังหรือเตรียมส่งเอกสารให้กระบี่');
  }

  if (request.request_type === 'EXPANSION' && request.status === 'WAIT_LAYOUT_DRAWING' && nextStatus !== 'READY_TO_SEND_KRABI') {
    throw new Error('งานขยายเขตต้องกดวาดผังเสร็จเพื่อไปสถานะเตรียมส่งเอกสารให้กระบี่');
  }

  if (nextStatus === 'WAIT_MANAGER_REVIEW' && !canMoveToManagerReview(request)) {
    throw new Error('ยังส่งให้ผู้จัดการตรวจไม่ได้ เพราะยังเซ็นใบแจ้งหนี้/ชำระเงินไม่ครบ');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({ status: nextStatus, updated_at: nowIso })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateRequestPaths(requestId);
  redirect(`/requests/${requestId}`);
}

type SurveyorAction = 'ACCEPT' | 'DOCS_INCOMPLETE' | 'REQUEST_RESCHEDULE' | 'COMPLETE';

const SURVEYOR_ALLOWED_CURRENT_STATUSES: Record<SurveyorAction, RequestStatus[]> = {
  ACCEPT: ['PENDING_SURVEY_REVIEW', 'SURVEY_DOCS_INCOMPLETE', 'SURVEY_RESCHEDULE_REQUESTED'],
  DOCS_INCOMPLETE: ['PENDING_SURVEY_REVIEW', 'SURVEY_ACCEPTED'],
  REQUEST_RESCHEDULE: ['PENDING_SURVEY_REVIEW', 'SURVEY_ACCEPTED'],
  COMPLETE: ['SURVEY_ACCEPTED', 'SURVEY_RESCHEDULE_REQUESTED']
};

export async function updateSurveyorAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const action = requiredField(formData, 'action') as SurveyorAction;
  const note = optionalField(formData, 'survey_note');
  const proposedDate = optionalField(formData, 'survey_reschedule_date');

  const nowIso = new Date().toISOString();
  const supabase = createServerSupabaseClient();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,request_type,collect_docs_on_site,scheduled_survey_date,survey_date_current')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if (!isValidRequestStatus(request.status)) {
    throw new Error('สถานะปัจจุบันไม่ถูกต้อง');
  }

  if ((request.request_type as RequestType) === 'METER') {
    throw new Error('งานขอมิเตอร์ใช้ workflow ใหม่ กรุณาใช้ action ในหน้า detail');
  }

  if (!Object.keys(SURVEYOR_ALLOWED_CURRENT_STATUSES).includes(action)) {
    throw new Error('ไม่รู้จักการทำรายการของนักสำรวจ');
  }

  if (!SURVEYOR_ALLOWED_CURRENT_STATUSES[action].includes(request.status)) {
    throw new Error('สถานะปัจจุบันไม่รองรับ action นี้');
  }

  if (action === 'DOCS_INCOMPLETE' && !note) {
    throw new Error('กรุณาระบุหมายเหตุว่าเอกสารขาดอะไร');
  }

  if (action === 'REQUEST_RESCHEDULE') {
    if (!proposedDate || !isValidDateOnly(proposedDate)) {
      throw new Error('กรุณาเลือกวันสำรวจใหม่ให้ถูกต้อง');
    }
  }

  const payload: {
    status: RequestStatus;
    survey_note?: string | null;
    survey_reschedule_date?: string | null;
    survey_reviewed_at?: string | null;
    survey_completed_at?: string | null;
    document_status?: 'COMPLETE' | 'INCOMPLETE' | null;
    collect_docs_on_site?: boolean;
    incomplete_docs_note?: string | null;
    updated_at: string;
  } = {
    status: 'PENDING_SURVEY_REVIEW',
    updated_at: nowIso
  };

  if (action === 'ACCEPT') {
    payload.status = 'SURVEY_ACCEPTED';
    payload.survey_note = note;
    payload.survey_reviewed_at = nowIso;
    payload.survey_reschedule_date = null;
  }

  if (action === 'DOCS_INCOMPLETE') {
    payload.status = 'SURVEY_DOCS_INCOMPLETE';
    payload.survey_note = note;
    payload.survey_reviewed_at = nowIso;
    payload.survey_completed_at = null;
  }

  if (action === 'REQUEST_RESCHEDULE') {
    payload.status = 'SURVEY_RESCHEDULE_REQUESTED';
    payload.survey_note = note;
    payload.survey_reschedule_date = proposedDate;
    payload.survey_reviewed_at = nowIso;
    payload.survey_completed_at = null;
  }

  if (action === 'COMPLETE') {
    payload.status = 'WAIT_DOCUMENT_REVIEW';
    payload.survey_note = note;
    payload.survey_completed_at = nowIso;
    payload.document_status = null;
    payload.collect_docs_on_site = false;
    payload.incomplete_docs_note = null;
  }

  const { error } = await supabase.from('service_requests').update(payload).eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateRequestPaths(requestId);
  redirect(`/requests/${requestId}`);
}

const DOCUMENT_REVIEW_DECISIONS: DocumentReviewDecision[] = [
  'COMPLETE',
  'INCOMPLETE_COLLECT_ON_SITE',
  'INCOMPLETE_WAIT_CUSTOMER'
];

function isDocumentReviewDecision(value: string): value is DocumentReviewDecision {
  return DOCUMENT_REVIEW_DECISIONS.includes(value as DocumentReviewDecision);
}

export async function updateDocumentReviewDecisionAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const decision = requiredField(formData, 'decision');
  const note = optionalField(formData, 'incomplete_docs_note');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  if (!isDocumentReviewDecision(decision)) {
    throw new Error('ผลการตรวจเอกสารไม่ถูกต้อง');
  }

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,request_type,collect_docs_on_site,scheduled_survey_date,survey_date_current')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if (!isValidRequestStatus(request.status)) {
    throw new Error('สถานะปัจจุบันไม่ถูกต้อง');
  }

  if (normalizeSurveyWorkflowStatus(request.status as RequestStatus) !== 'WAIT_DOCUMENT_REVIEW') {
    throw new Error('บันทึกผลตรวจเอกสารได้เฉพาะงานที่อยู่สถานะรอตรวจเอกสาร');
  }

  const resolved = resolveDocumentReviewDecision(decision);
  const effectiveSurveyDate = getEffectiveSurveyDate(request);

  if (decision !== 'COMPLETE' && !note) {
    throw new Error('กรณีเอกสารไม่ครบ กรุณาระบุหมายเหตุเอกสารขาด');
  }

  if (decision === 'COMPLETE' && note) {
    throw new Error('กรณีเอกสารครบ ไม่ต้องระบุหมายเหตุเอกสารขาด');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: resolved.nextStatus,
      document_status: resolved.documentStatus,
      collect_docs_on_site: resolved.collectDocsOnSite,
      incomplete_docs_note: resolved.documentStatus === 'INCOMPLETE' ? note : null,
      awaiting_customer_documents_since: decision === 'INCOMPLETE_WAIT_CUSTOMER' ? nowIso : null,
      previous_survey_date: decision === 'INCOMPLETE_WAIT_CUSTOMER' ? effectiveSurveyDate : null,
      survey_date_current: decision === 'INCOMPLETE_WAIT_CUSTOMER' ? null : request.survey_date_current,
      survey_rescheduled_at: decision === 'INCOMPLETE_WAIT_CUSTOMER' && effectiveSurveyDate ? nowIso : null,
      survey_reschedule_reason:
        decision === 'INCOMPLETE_WAIT_CUSTOMER' && effectiveSurveyDate ? 'รอเอกสารจากผู้ใช้ไฟ' : null,
      updated_at: nowIso
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateRequestPaths(requestId);
  redirect(`/requests/${requestId}`);
}

export async function confirmDocumentsReceivedFromCustomerAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if (!isValidRequestStatus(request.status)) {
    throw new Error('สถานะปัจจุบันไม่ถูกต้อง');
  }

  if (request.status !== 'WAIT_DOCUMENT_FROM_CUSTOMER') {
    throw new Error('ยืนยันรับเอกสารได้เฉพาะงานที่อยู่สถานะรอผู้ใช้ไฟนำเอกสารมาให้');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: 'READY_FOR_SURVEY',
      document_status: 'COMPLETE',
      collect_docs_on_site: false,
      documents_received_at: nowIso,
      updated_at: nowIso
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateRequestPaths(requestId);
  redirect(`/requests/${requestId}`);
}

export async function startSurveyAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,request_type,collect_docs_on_site,scheduled_survey_date,survey_date_current')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if (!['READY_FOR_SURVEY', 'READY_FOR_RESURVEY', 'SURVEY_ACCEPTED', 'SURVEY_RESCHEDULE_REQUESTED'].includes(request.status)) {
    throw new Error('รับงาน/ไปสำรวจได้เฉพาะสถานะพร้อมรับงานสำรวจ หรือรอตรวจซ้ำ');
  }

  const normalizedStatus = normalizeSurveyWorkflowStatus(request.status as RequestStatus);
  if (normalizedStatus === 'READY_FOR_SURVEY' && !canStartSurvey({ ...request, status: normalizedStatus })) {
    throw new Error('ต้องกำหนดวันนัดสำรวจล่าสุดก่อนเริ่มสำรวจ');
  }

  const { error } = await supabase.from('service_requests').update({ status: 'IN_SURVEY', updated_at: nowIso }).eq('id', requestId);
  if (error) {
    throw new Error(error.message);
  }

  revalidateRequestPaths(requestId);
  redirect(`/requests/${requestId}`);
}

export async function completeSurveyAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const surveyNote = optionalField(formData, 'survey_note');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,request_type,collect_docs_on_site,survey_note')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if (request.status !== 'IN_SURVEY') {
    throw new Error('กดสำรวจเสร็จได้เฉพาะสถานะกำลังสำรวจหน้างาน');
  }
  const collectDocsOnSite = Boolean((request as { collect_docs_on_site?: boolean }).collect_docs_on_site);
  const requestType = request.request_type as RequestType;

  const { error } = await supabase
    .from('service_requests')
    .update({
      status:
        requestType === 'METER'
          ? collectDocsOnSite
            ? 'SURVEY_COMPLETED'
            : 'WAIT_BILLING'
          : 'WAIT_LAYOUT_DRAWING',
      survey_note: surveyNote,
      survey_completed_at: nowIso,
      updated_at: nowIso
    })
    .eq('id', requestId);
  if (error) {
    throw new Error(error.message);
  }

  revalidateRequestPaths(requestId);
  redirect(`/requests/${requestId}`);
}

export async function completeLayoutDrawingAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const drawingNote = optionalField(formData, 'survey_note');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,request_type,survey_note')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if ((request.request_type as RequestType) !== 'EXPANSION') {
    throw new Error('action นี้รองรับเฉพาะงานขยายเขต');
  }

  if (!['WAIT_LAYOUT_DRAWING', 'SURVEY_COMPLETED'].includes(request.status)) {
    throw new Error('กดวาดผังเสร็จได้เฉพาะสถานะรอวาดผัง');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: 'READY_TO_SEND_KRABI',
      survey_note: drawingNote ?? request.survey_note ?? null,
      updated_at: nowIso
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateRequestPaths(requestId);
  redirect(`/requests/${requestId}`);
}

type SurveyVerificationMode = 'PHOTO_OR_RESURVEY' | 'RESURVEY_ONLY';

function isSurveyVerificationMode(value: string): value is SurveyVerificationMode {
  return ['PHOTO_OR_RESURVEY', 'RESURVEY_ONLY'].includes(value);
}

export async function markSurveyPassedAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const surveyNote = optionalField(formData, 'survey_note');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase.from('service_requests').select('id,status,request_type').eq('id', requestId).single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if (!canMarkSurveyPassed({ status: request.status as RequestStatus, request_type: request.request_type as RequestType })) {
    throw new Error('ยืนยันสำรวจผ่านได้เฉพาะงานขอมิเตอร์ที่กำลังสำรวจอยู่');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: 'WAIT_BILLING',
      survey_result: 'PASS',
      fix_approved_via: 'RESURVEY',
      survey_note: surveyNote,
      survey_completed_at: nowIso,
      photo_review_status: null,
      photo_reviewed_at: null,
      photo_reviewed_by: null,
      updated_at: nowIso
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateRequestPaths(requestId);
  redirect(`/requests/${requestId}`);
}

export async function markSurveyFailedAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const customerFixNote = requiredField(formData, 'customer_fix_note');
  const fixVerificationMode = requiredField(formData, 'fix_verification_mode');
  const surveyNote = optionalField(formData, 'survey_note');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  if (!isSurveyVerificationMode(fixVerificationMode)) {
    throw new Error('รูปแบบการตรวจหลังแก้ไขไม่ถูกต้อง');
  }

  const { data: request, error: requestError } = await supabase.from('service_requests').select('id,status,request_type').eq('id', requestId).single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if (!canMarkSurveyFailed({ status: request.status as RequestStatus, request_type: request.request_type as RequestType })) {
    throw new Error('บันทึกผลสำรวจไม่ผ่านได้เฉพาะงานขอมิเตอร์ที่กำลังสำรวจอยู่');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: 'WAIT_CUSTOMER_FIX',
      survey_result: 'FAIL',
      customer_fix_note: customerFixNote,
      fix_verification_mode: fixVerificationMode,
      survey_note: surveyNote,
      survey_completed_at: nowIso,
      customer_fix_reported_at: null,
      photo_review_status: null,
      photo_reviewed_at: null,
      photo_reviewed_by: null,
      fix_approved_via: null,
      updated_at: nowIso
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateRequestPaths(requestId);
  redirect(`/requests/${requestId}`);
}

export async function reportCustomerFixAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const customerFixNote = optionalField(formData, 'customer_fix_note');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,request_type,fix_verification_mode,customer_fix_note')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if ((request.request_type as RequestType) !== 'METER') {
    throw new Error('action นี้รองรับเฉพาะงานขอมิเตอร์');
  }

  if (request.status !== 'WAIT_CUSTOMER_FIX') {
    throw new Error('ยืนยันการแก้ไขของผู้ใช้ไฟได้เฉพาะสถานะรอผู้ใช้ไฟแก้ไข');
  }

  const photoAllowed = request.fix_verification_mode === 'PHOTO_OR_RESURVEY';
  const { error } = await supabase
    .from('service_requests')
    .update({
      status: photoAllowed ? 'WAIT_FIX_REVIEW' : 'READY_FOR_RESURVEY',
      customer_fix_reported_at: nowIso,
      customer_fix_note: customerFixNote ?? request.customer_fix_note ?? null,
      photo_review_status: photoAllowed ? 'PENDING' : null,
      updated_at: nowIso
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateRequestPaths(requestId);
  redirect(`/requests/${requestId}`);
}

export async function moveToResurveyAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase.from('service_requests').select('id,status,request_type').eq('id', requestId).single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if ((request.request_type as RequestType) !== 'METER') {
    throw new Error('action นี้รองรับเฉพาะงานขอมิเตอร์');
  }

  if (!['WAIT_CUSTOMER_FIX', 'WAIT_FIX_REVIEW'].includes(request.status)) {
    throw new Error('นัดตรวจซ้ำได้เฉพาะสถานะรอผู้ใช้ไฟแก้ไข หรือรอตรวจจากรูป');
  }

  const { error } = await supabase.from('service_requests').update({ status: 'READY_FOR_RESURVEY', updated_at: nowIso }).eq('id', requestId);
  if (error) {
    throw new Error(error.message);
  }
  revalidateRequestPaths(requestId);
  redirect(`/requests/${requestId}`);
}

export async function approveFixFromPhotoAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const reviewer = requiredField(formData, 'photo_reviewed_by');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,request_type,fix_verification_mode')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if ((request.request_type as RequestType) !== 'METER') {
    throw new Error('action นี้รองรับเฉพาะงานขอมิเตอร์');
  }

  if (!canApproveFixFromPhoto({ status: request.status as RequestStatus, fix_verification_mode: request.fix_verification_mode })) {
    throw new Error('อนุมัติผ่านจากรูปได้เฉพาะงานที่รอตรวจจากรูป และเคสที่อนุญาตให้ใช้รูป');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: 'WAIT_BILLING',
      photo_review_status: 'APPROVED',
      photo_reviewed_at: nowIso,
      photo_reviewed_by: reviewer,
      fix_approved_via: 'PHOTO',
      updated_at: nowIso
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateRequestPaths(requestId);
  redirect(`/requests/${requestId}`);
}

export async function rejectFixPhotoAndRequireResurveyAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const reviewer = requiredField(formData, 'photo_reviewed_by');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase.from('service_requests').select('id,status,request_type').eq('id', requestId).single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if ((request.request_type as RequestType) !== 'METER') {
    throw new Error('action นี้รองรับเฉพาะงานขอมิเตอร์');
  }

  if (request.status !== 'WAIT_FIX_REVIEW') {
    throw new Error('สั่งตรวจซ้ำจากรูปได้เฉพาะสถานะรอตรวจจากรูป');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: 'READY_FOR_RESURVEY',
      photo_review_status: 'REJECTED',
      photo_reviewed_at: nowIso,
      photo_reviewed_by: reviewer,
      updated_at: nowIso
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateRequestPaths(requestId);
  redirect(`/requests/${requestId}`);
}

export async function updateSurveyScheduleAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const surveyDateCurrent = requiredField(formData, 'survey_date_current');
  const surveyRescheduleReason = optionalField(formData, 'survey_reschedule_reason');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  if (!isValidDateOnly(surveyDateCurrent)) {
    throw new Error('รูปแบบวันสำรวจไม่ถูกต้อง');
  }

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,scheduled_survey_date,survey_date_initial,survey_date_current,previous_survey_date')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if (!['READY_FOR_SURVEY', 'WAIT_DOCUMENT_FROM_CUSTOMER', 'READY_FOR_RESURVEY'].includes(request.status)) {
    throw new Error('กำหนดวันสำรวจได้เฉพาะงานที่พร้อมสำรวจ/รอตรวจซ้ำ หรือกำลังรอเอกสารจากลูกค้า');
  }

  const previousSurveyDate = getEffectiveSurveyDate(request);
  const isReschedule = Boolean(previousSurveyDate && previousSurveyDate !== surveyDateCurrent);

  if (isReschedule && !surveyRescheduleReason) {
    throw new Error('กรณีแก้ไขวันนัด กรุณาระบุเหตุผลการเลื่อนนัด');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: request.status === 'WAIT_DOCUMENT_FROM_CUSTOMER' ? 'READY_FOR_SURVEY' : request.status,
      scheduled_survey_date: surveyDateCurrent,
      survey_date_initial: request.survey_date_initial ?? previousSurveyDate ?? surveyDateCurrent,
      previous_survey_date: isReschedule ? previousSurveyDate : request.previous_survey_date ?? null,
      survey_date_current: surveyDateCurrent,
      survey_rescheduled_at: isReschedule ? nowIso : null,
      survey_reschedule_reason: isReschedule ? surveyRescheduleReason : null,
      updated_at: nowIso
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateRequestPaths(requestId);
  redirect(`/requests/${requestId}`);
}

export async function confirmOnSiteDocumentsCompleteAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,request_type,collect_docs_on_site,document_status')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if ((request.request_type as RequestType) !== 'METER') {
    throw new Error('action นี้รองรับเฉพาะงานขอมิเตอร์');
  }

  if (request.status !== 'SURVEY_COMPLETED') {
    throw new Error('ยืนยันเอกสารครบหลังสำรวจได้เฉพาะสถานะสำรวจเสร็จ');
  }

  if (!request.collect_docs_on_site) {
    throw new Error('งานนี้ไม่ใช่เคสรับเอกสารหน้างาน');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({ status: 'WAIT_BILLING', document_status: 'COMPLETE', updated_at: nowIso })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateRequestPaths(requestId);
  redirect(`/requests/${requestId}`);
}

export async function issueBillingAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const billedBy = requiredField(formData, 'billed_by');
  const billingAmount = parseBillingAmount(requiredField(formData, 'billing_amount'));
  const billingNote = optionalField(formData, 'billing_note');

  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,request_type')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if (!isValidRequestStatus(request.status)) {
    throw new Error('สถานะปัจจุบันไม่ถูกต้อง');
  }

  assertMeterLoopAllowed(request.request_type as RequestType);

  if (request.status !== 'WAIT_BILLING') {
    throw new Error('ออกใบแจ้งหนี้ได้เฉพาะงานที่อยู่สถานะรอออกใบแจ้งหนี้');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: 'WAIT_ACTION_CONFIRMATION',
      billing_amount: billingAmount,
      billing_note: billingNote,
      billed_at: nowIso,
      billed_by: billedBy,
      updated_at: nowIso
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateRequestPaths(requestId);
  redirect(`/requests/${requestId}`);
}

export async function confirmBillingSurveyorSignAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const invoiceSignedBy = requiredField(formData, 'invoice_signed_by');

  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,request_type,billing_amount,billed_at,invoice_signed_at,paid_at')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if (!isValidRequestStatus(request.status)) {
    throw new Error('สถานะปัจจุบันไม่ถูกต้อง');
  }

  assertMeterLoopAllowed(request.request_type as RequestType);

  if (request.status !== 'WAIT_ACTION_CONFIRMATION') {
    throw new Error('เซ็นรับรองได้เฉพาะงานที่อยู่ช่วงรอดำเนินการหลังแจ้งหนี้');
  }

  if (!request.billing_amount || !request.billed_at) {
    throw new Error('ยังไม่สามารถเซ็นรับรองได้ เพราะยังไม่พบข้อมูลการออกใบแจ้งหนี้');
  }

  if (request.invoice_signed_at) {
    throw new Error('มีการบันทึกการเซ็นใบแจ้งหนี้แล้ว');
  }

  const resolvedStatus = resolvePostBillingPhase({
    invoice_signed_at: nowIso,
    paid_at: request.paid_at
  });

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: resolvedStatus,
      invoice_signed_at: nowIso,
      invoice_signed_by: invoiceSignedBy,
      updated_at: nowIso
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateRequestPaths(requestId);
  redirect(`/requests/${requestId}`);
}

export async function updateRequestAssigneeAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const assigneeId = requiredField(formData, 'assignee_id');

  const supabase = createServerSupabaseClient();

  const { data: assignee, error: assigneeError } = await supabase
    .from('assignees')
    .select('id,code,name,is_active')
    .eq('id', assigneeId)
    .eq('is_active', true)
    .single();

  if (assigneeError || !assignee) {
    throw new Error(assigneeError?.message ?? 'Assignee not found');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      assignee_id: assignee.id,
      assignee_code: assignee.code,
      assignee_name: assignee.name,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateRequestPaths(requestId);
  redirect(`/requests/${requestId}`);
}

export async function confirmPaymentReceivedAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const paidBy = requiredField(formData, 'paid_by');

  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,request_type,invoice_signed_at,paid_at')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if (!isValidRequestStatus(request.status)) {
    throw new Error('สถานะปัจจุบันไม่ถูกต้อง');
  }

  assertMeterLoopAllowed(request.request_type as RequestType);

  if (request.status !== 'WAIT_ACTION_CONFIRMATION') {
    throw new Error('ยืนยันชำระเงินได้เฉพาะงานที่อยู่ช่วงรอดำเนินการหลังแจ้งหนี้');
  }

  if (request.paid_at) {
    throw new Error('มีการบันทึกการชำระเงินแล้ว');
  }

  const resolvedStatus = resolvePostBillingPhase({
    invoice_signed_at: request.invoice_signed_at,
    paid_at: nowIso
  });

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: resolvedStatus,
      paid_at: nowIso,
      paid_by: paidBy,
      updated_at: nowIso
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateRequestPaths(requestId);
  redirect(`/requests/${requestId}`);
}

export async function approveManagerReviewAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,request_type,invoice_signed_at,paid_at')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if (!isValidRequestStatus(request.status)) {
    throw new Error('สถานะปัจจุบันไม่ถูกต้อง');
  }

  assertMeterLoopAllowed(request.request_type as RequestType);

  if (request.status !== 'WAIT_MANAGER_REVIEW') {
    throw new Error('ผู้จัดการอนุมัติได้เฉพาะงานที่รอผู้จัดการตรวจ');
  }

  if (!canMoveToManagerReview(request)) {
    throw new Error('ยังอนุมัติไม่ได้ เพราะยังไม่ครบเงื่อนไขเซ็นใบแจ้งหนี้และชำระเงิน');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: 'COMPLETED',
      updated_at: nowIso
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateRequestPaths(requestId);
  redirect(`/requests/${requestId}`);
}
