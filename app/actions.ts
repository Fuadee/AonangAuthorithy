'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { generateRequestNo } from '@/lib/requests/generateRequestNo';
import { isAreaCode } from '@/lib/requests/areas';
import {
  canMoveToManagerReview,
  REQUEST_STATUSES,
  RequestStatus,
  REQUEST_TYPES,
  RequestType,
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

function optionalField(formData: FormData, key: string): string | null {
  const value = formData.get(key)?.toString().trim();
  return value ? value : null;
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

  if (!REQUEST_TYPES.includes(requestType as (typeof REQUEST_TYPES)[number])) {
    throw new Error('Invalid request type');
  }

  if ((assignedSurveyor && !scheduledSurveyDate) || (!assignedSurveyor && scheduledSurveyDate)) {
    throw new Error('กรุณาระบุผู้สำรวจและวันสำรวจให้ครบทั้งคู่');
  }

  if (scheduledSurveyDate && !isValidDateOnly(scheduledSurveyDate)) {
    throw new Error('รูปแบบวันสำรวจไม่ถูกต้อง');
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

  const initialStatus: RequestStatus = assignedSurveyor && scheduledSurveyDate ? 'PENDING_SURVEY_REVIEW' : 'NEW';

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
    status: initialStatus,
    request_type: requestType
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
    .select('id,status,invoice_signed_at,paid_at')
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

  if (request.status === 'WAIT_BILLING' && (nextStatus === 'WAIT_MANAGER_REVIEW' || nextStatus === 'COMPLETED')) {
    throw new Error('ห้ามข้ามจากรอออกใบแจ้งหนี้ไปสถานะปลายทางโดยตรง');
  }

  if (request.status === 'WAIT_ACTION_CONFIRMATION' && nextStatus === 'COMPLETED') {
    throw new Error('ต้องผ่านการตรวจของผู้จัดการก่อนปิดงาน');
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
    .select('id,status')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if (!isValidRequestStatus(request.status)) {
    throw new Error('สถานะปัจจุบันไม่ถูกต้อง');
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
    payload.status = 'SURVEY_COMPLETED';
    payload.survey_note = note;
    payload.survey_completed_at = nowIso;
  }

  const { error } = await supabase.from('service_requests').update(payload).eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateRequestPaths(requestId);
  redirect(`/requests/${requestId}`);
}

export async function sendMeterRequestToBillingAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();

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

  if (request.status !== 'SURVEY_COMPLETED') {
    throw new Error('ส่งให้ออกใบแจ้งหนี้ได้เฉพาะงานที่สำรวจแล้ว');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({ status: 'WAIT_BILLING', updated_at: new Date().toISOString() })
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
