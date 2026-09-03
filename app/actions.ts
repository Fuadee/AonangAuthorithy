'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { generateRequestNo } from '@/lib/requests/generateRequestNo';
import { isAreaCode } from '@/lib/requests/areas';
import { isFutureBangkokDate } from '@/lib/datetime';
import {
  canApproveFixFromPhoto,
  canMarkSurveyFailed,
  canMarkSurveyPassed,
  canStartSurvey,
  calculateNextPlannedDispatchDate,
  canEvaluateThreePhaseCapability,
  DocumentReviewDecision,
  normalizeSurveyWorkflowStatus,
  REQUEST_STATUSES,
  RequestStatus,
  REQUEST_TYPES,
  RequestType,
  resolveDocumentReviewDecision,
  shouldUseExpansionActionSet,
  isThirtyOneHundredRequestType
} from '@/lib/requests/types';
import { resolveRequestSubmission } from '@/lib/requests/request-intent';
import {
  resolveEligibilityReviewStatus,
  resolveExpansionPostEstimationStatus,
  resolvePassedSurveyStatus,
  resolveSurveyCompletionStatus,
  resolveThreePhaseCapabilityStatus
} from '@/lib/requests/workflow-transitions';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function requiredField(formData: FormData, key: string): string {
  const value = formData.get(key)?.toString().trim();
  if (!value) {
    throw new Error(`Missing required field: ${key}`);
  }

  return value;
}

function requiredOneOfFields(formData: FormData, keys: string[]): string {
  for (const key of keys) {
    const value = formData.get(key)?.toString().trim();
    if (value) {
      return value;
    }
  }

  throw new Error(`Missing required field: ${keys[0]}`);
}

function snapshotFormData(formData: FormData): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    snapshot[key] = value.toString();
  }
  return snapshot;
}

function getEffectiveSurveyDate(request: { survey_date_current?: string | null; scheduled_survey_date?: string | null }): string | null {
  return request.scheduled_survey_date ?? null;
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

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getActionErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'ไม่สามารถบันทึกคำร้องได้ กรุณาลองใหม่อีกครั้ง';
}

function formatActionTimestamp(value: string): string {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok'
  }).format(new Date(value));
}

function isValidRequestStatus(status: string): status is RequestStatus {
  return REQUEST_STATUSES.includes(status as RequestStatus);
}


function assertExpansionWorkflowAllowed(request: { request_type: RequestType; status: RequestStatus; three_phase_capability_result?: 'SUPPORTED' | 'UNSUPPORTED' | null }): void {
  if (!shouldUseExpansionActionSet(request)) {
    throw new Error('action นี้รองรับเฉพาะงานขยายเขต หรือคำร้อง 3 เฟสที่ถูกส่งต่อเข้า flow ขยายเขตแล้ว');
  }
}

function revalidateRequestPaths(requestId: string): void {
  revalidatePath('/dashboard');
  revalidatePath('/surveyor');
  revalidatePath('/manager');
  revalidatePath('/document');
  revalidatePath('/krabi');
  revalidatePath('/survey/planning');
  revalidatePath('/survey/map');
  revalidatePath('/analytics');
  revalidatePath(`/requests/${requestId}`);
}

function shouldStayOnQueue(formData: FormData): boolean {
  const stayOnQueue = formData.get('stay_on_queue')?.toString() === '1';
  return stayOnQueue;
}

function finalizeWorkflowAction(requestId: string, formData: FormData): void {
  const stayOnQueue = shouldStayOnQueue(formData);
  const returnTo = formData.get('return_to')?.toString() ?? null;

  console.info('[workflow-action] finalize', {
    requestId,
    stayOnQueue,
    returnTo
  });

  revalidateRequestPaths(requestId);
  if (!stayOnQueue) {
    redirect(`/requests/${requestId}`);
  }
}

const ALLOWED_STATUS_TRANSITIONS: Partial<Record<RequestStatus, RequestStatus[]>> = {
  WAIT_LAYOUT_DRAWING: ['WAITING_TO_SEND_TO_KRABI'],
  WAITING_TO_SEND_TO_KRABI: ['SENT_TO_KRABI'],
  WAIT_KRABI_DOCUMENT_CHECK: ['KRABI_IN_PROGRESS', 'KRABI_NEEDS_DOCUMENT_FIX'],
  KRABI_NEEDS_DOCUMENT_FIX: ['WAITING_TO_SEND_TO_KRABI'],
  KRABI_IN_PROGRESS: ['KRABI_ESTIMATION_COMPLETED'],
  KRABI_ESTIMATION_COMPLETED: ['COORDINATED_WITH_CONSTRUCTION'],
  WAIT_MANAGER_REVIEW: ['COMPLETED'],
  WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL: ['SENT_TO_KRABI', 'RETURNED_FOR_RESURVEY'],
  SURVEY_OVERLOAD_REPORTED: ['COMPLETED_OVERLOAD_FORWARD'],
  SENT_TO_KRABI: ['WAIT_KRABI_DOCUMENT_CHECK', 'WAIT_KRABI_APPROVAL'],
  WAIT_KRABI_APPROVAL: ['KRABI_APPROVED', 'KRABI_NEEDS_CORRECTION'],
  KRABI_NEEDS_CORRECTION: ['DOCUMENT_FIX'],
  DOCUMENT_FIX: ['RESENT_TO_KRABI'],
  RESENT_TO_KRABI: ['WAIT_KRABI_APPROVAL'],
  KRABI_APPROVED: ['WAIT_ELIGIBILITY_REVIEW'],
  WAIT_RECEIVE_FROM_KRABI: ['WAIT_ELIGIBILITY_REVIEW'],
  WAIT_ELIGIBILITY_REVIEW: ['WAIT_AONANG_MANAGER_FINAL_APPROVAL'],
  WAIT_AONANG_MANAGER_FINAL_APPROVAL: ['COMPLETED']
};

const REQUEST_TYPES_CONVERTIBLE_TO_EXPANSION: RequestType[] = ['METER', 'METER_30_100_1P'];

type CreatedRequest = {
  id: string;
  request_no: string;
  duplicate: boolean;
};

async function createRequest(formData: FormData): Promise<CreatedRequest> {
  const submissionId = requiredField(formData, 'submission_id');
  if (!isValidUuid(submissionId)) {
    throw new Error('Invalid submission ID');
  }

  const supabase = createServerSupabaseClient();
  const { data: existingRequest, error: existingRequestError } = await supabase
    .from('service_requests')
    .select('id,request_no')
    .eq('submission_id', submissionId)
    .maybeSingle();

  if (existingRequestError) {
    throw new Error(existingRequestError.message);
  }

  if (existingRequest) {
    console.info('[createRequestAction] duplicate submission returned existing request', {
      submissionId,
      requestId: existingRequest.id,
      requestNo: existingRequest.request_no
    });
    return { ...existingRequest, duplicate: true };
  }

  const customerName = requiredField(formData, 'customer_name');
  const phone = requiredField(formData, 'phone');
  const areaCode = requiredField(formData, 'area_code');
  const assignedSurveyorId = requiredField(formData, 'assigned_surveyor_id');
  const legacyRequestType = optionalField(formData, 'request_type');
  const submission = resolveRequestSubmission({
    intent: optionalField(formData, 'intent'),
    meterSize: optionalField(formData, 'meter_size'),
    phase: optionalField(formData, 'phase'),
    legacyRequestType
  });
  const requestType = submission.requestType;
  const flowType = submission.flowType;
  const assignedSurveyor = optionalField(formData, 'assigned_surveyor');
  const scheduledSurveyDate = requiredField(formData, 'scheduled_survey_date');
  const houseNumber = optionalField(formData, 'house_number');
  const villageNo = optionalField(formData, 'village_no');
  const road = optionalField(formData, 'road');
  const landmark = optionalField(formData, 'landmark');
  const latitude = parseOptionalCoordinate(formData, 'latitude');
  const longitude = parseOptionalCoordinate(formData, 'longitude');
  const locationNote = optionalField(formData, 'location_note');

  if (!REQUEST_TYPES.includes(requestType as (typeof REQUEST_TYPES)[number])) {
    throw new Error('Invalid request type');
  }

  if (scheduledSurveyDate && !isValidDateOnly(scheduledSurveyDate)) {
    throw new Error('รูปแบบวันสำรวจไม่ถูกต้อง');
  }

  if (!isFutureBangkokDate(scheduledSurveyDate)) {
    throw new Error('วันสำรวจต้องเป็นวันถัดไปจากวันนี้ (Asia/Bangkok)');
  }

  if ((latitude === null) !== (longitude === null)) {
    throw new Error('กรุณาระบุพิกัด latitude และ longitude ให้ครบทั้งคู่');
  }

  const hasFlexibleAddress = [houseNumber, villageNo, road, landmark].some((value) => !!value);
  const hasMapPin = latitude !== null && longitude !== null;
  if (!hasFlexibleAddress && !hasMapPin) {
    throw new Error('กรุณาระบุข้อมูลตำแหน่งอย่างน้อย 1 รายการ');
  }

  if (latitude !== null && longitude !== null) {
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error('ค่าพิกัดไม่ถูกต้อง');
    }
  }

  if (!isAreaCode(areaCode)) {
    throw new Error('Invalid area code');
  }

  const [{ data: area, error: areaError }, { data: assignee, error: assigneeError }] = await Promise.all([
    supabase.from('areas').select('id,code,name').eq('code', areaCode).single(),
    supabase
      .from('assignees')
      .select('id,code,name,is_active')
      .eq('id', assignedSurveyorId)
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

  console.info('[survey-submit] create request payload', {
    requestNo,
    areaCode: area.code,
    intent: submission.intent,
    meterSize: submission.meterSize,
    phase: submission.phase,
    flowType,
    pathFamily: submission.pathFamily,
    requestType,
    assignedSurveyorId: assignee.id,
    assignedSurveyorName: assignee.name,
    submittedAssignedSurveyor: assignedSurveyor,
    scheduledSurveyDate
  });

  const { data: insertedRequest, error: insertError } = await supabase
    .from('service_requests')
    .insert({
      submission_id: submissionId,
      request_no: requestNo,
      customer_name: customerName,
      phone,
      area_id: area.id,
      area_code: area.code,
      area_name: area.name,
      assignee_id: assignee.id,
      assignee_code: assignee.code,
      assignee_name: assignee.name,
      assigned_surveyor_id: assignee.id,
      assigned_surveyor: assignee.name,
      scheduled_survey_date: scheduledSurveyDate,
      survey_date_initial: scheduledSurveyDate,
      survey_date_current: scheduledSurveyDate,
      status: initialStatus,
      request_type: requestType,
      request_intent: submission.intent,
      meter_size: submission.meterSize,
      phase: submission.phase,
      flow_type: flowType,
      house_number: houseNumber,
      village_no: villageNo,
      road,
      landmark,
      latitude,
      longitude,
      location_note: locationNote,
      collect_docs_on_site: false
    })
    .select('id,request_no,created_at,updated_at,status')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: racedRequest, error: racedRequestError } = await supabase
        .from('service_requests')
        .select('id,request_no')
        .eq('submission_id', submissionId)
        .maybeSingle();

      if (racedRequestError) {
        throw new Error(racedRequestError.message);
      }

      if (racedRequest) {
        console.info('[createRequestAction] concurrent duplicate returned existing request', {
          submissionId,
          requestId: racedRequest.id,
          requestNo: racedRequest.request_no
        });
        return { ...racedRequest, duplicate: true };
      }
    }

    throw new Error(insertError.message);
  }

  console.info('[createRequestAction] inserted request confirmed in DB', insertedRequest);

  return {
    id: insertedRequest.id,
    request_no: insertedRequest.request_no,
    duplicate: false
  };
}

export async function createRequestAction(
  _previousState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  let createdRequest: CreatedRequest;

  try {
    createdRequest = await createRequest(formData);
  } catch (error) {
    console.error('[createRequestAction] create failed', error);
    return { error: getActionErrorMessage(error) };
  }

  console.info('[createRequestAction] revalidate after create', {
    requestId: createdRequest.id,
    requestNo: createdRequest.request_no,
    duplicate: createdRequest.duplicate,
    paths: ['/dashboard', '/surveyor', '/analytics']
  });

  revalidatePath('/dashboard');
  revalidatePath('/surveyor');
  revalidatePath('/analytics');
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
    .select('id,status,request_type,collect_docs_on_site,document_status,fix_verification_mode')
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

  if (['METER', 'METER_30_100_1P', 'METER_30_100_3P', 'METER_TO_3PHASE'].includes(request.request_type) && request.status === 'WAIT_DOCUMENT_FROM_CUSTOMER' && nextStatus === 'READY_FOR_SURVEY') {
    throw new Error('ต้องกด action “ได้รับเอกสารแล้ว” เพื่อยืนยันเอกสารครบก่อนรับงาน');
  }

  if (
    request.request_type === 'METER' &&
    [
      'WAIT_LAYOUT_DRAWING',
      'WAITING_TO_SEND_TO_KRABI',
      'SENT_TO_KRABI',
      'WAIT_KRABI_DOCUMENT_CHECK',
      'KRABI_NEEDS_DOCUMENT_FIX',
      'KRABI_IN_PROGRESS',
      'KRABI_ESTIMATION_COMPLETED',
      'COORDINATED_WITH_CONSTRUCTION'
    ].includes(nextStatus)
  ) {
    throw new Error('สถานะวาดผัง/ส่งเอกสารกระบี่รองรับเฉพาะงานขยายเขตเท่านั้น');
  }

  if (request.request_type === 'EXPANSION' && ['INSTALLATION', 'INSPECTION', 'DESIGN_AND_ESTIMATE', 'CHECK_3PHASE_CAPABILITY'].includes(nextStatus)) {
    throw new Error('งานขยายเขตไม่สามารถใช้สถานะ flow งานเพิ่มเป็นมิเตอร์ 3 เฟสได้');
  }

  if (request.request_type === 'EXPANSION' && request.status === 'SURVEY_COMPLETED' && !['WAIT_LAYOUT_DRAWING', 'WAITING_TO_SEND_TO_KRABI'].includes(nextStatus)) {
    throw new Error('งานขยายเขตหลังสำรวจต้องไปขั้นรอวาดผังหรือรอจัดส่งเอกสาร');
  }

  if (request.request_type === 'EXPANSION' && request.status === 'WAIT_LAYOUT_DRAWING' && nextStatus !== 'WAITING_TO_SEND_TO_KRABI') {
    throw new Error('งานขยายเขตต้องกดวาดผังเสร็จเพื่อไปสถานะรอจัดส่งเอกสาร');
  }

  if (nextStatus === 'WAIT_MANAGER_REVIEW') {
    if (isThirtyOneHundredRequestType(request.request_type as RequestType)) {
      throw new Error('งานขอมิเตอร์ 30/100 ต้องใช้สถานะผู้จัดการก่อนส่งกระบี่หรืออนุมัติรอบสุดท้ายตามขั้นตอน');
    }

  }

  const { error } = await supabase
    .from('service_requests')
    .update({ status: nextStatus, updated_at: nowIso })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  finalizeWorkflowAction(requestId, formData);
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

  if (['METER_30_100_1P', 'METER_30_100_3P'].includes(request.request_type as RequestType)) {
    throw new Error('งานขอมิเตอร์ 30/100 ใช้ workflow ใหม่ กรุณาใช้ action ในหน้า detail');
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
    scheduled_survey_date?: string | null;
    survey_date_current?: string | null;
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
    payload.scheduled_survey_date = proposedDate;
    payload.survey_date_current = proposedDate;
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

  finalizeWorkflowAction(requestId, formData);
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
      scheduled_survey_date: decision === 'INCOMPLETE_WAIT_CUSTOMER' ? null : request.scheduled_survey_date,
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

  finalizeWorkflowAction(requestId, formData);
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

  finalizeWorkflowAction(requestId, formData);
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

  finalizeWorkflowAction(requestId, formData);
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
      status: resolveSurveyCompletionStatus(requestType, collectDocsOnSite),
      survey_note: surveyNote,
      survey_completed_at: nowIso,
      updated_at: nowIso
    })
    .eq('id', requestId);
  if (error) {
    throw new Error(error.message);
  }

  finalizeWorkflowAction(requestId, formData);
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

  assertExpansionWorkflowAllowed({
    request_type: request.request_type as RequestType,
    status: request.status as RequestStatus
  });

  if (!['WAIT_LAYOUT_DRAWING', 'SURVEY_COMPLETED'].includes(request.status)) {
    throw new Error('กดวาดผังเสร็จได้เฉพาะสถานะรอวาดผัง');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: 'WAITING_TO_SEND_TO_KRABI',
      survey_note: drawingNote ?? request.survey_note ?? null,
      is_document_ready: true,
      document_prepared_at: nowIso,
      planned_dispatch_date: null,
      dispatched_to_krabi_at: null,
      dispatched_to_krabi_by: null,
      krabi_received_at: null,
      krabi_in_progress_at: null,
      krabi_completed_at: null,
      updated_at: nowIso
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  finalizeWorkflowAction(requestId, formData);
}

export async function markDocumentReadyAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase.from('service_requests').select('id,status,request_type,is_document_ready').eq('id', requestId).single();
  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  assertExpansionWorkflowAllowed({
    request_type: request.request_type as RequestType,
    status: request.status as RequestStatus
  });
  if (request.status !== 'WAITING_TO_SEND_TO_KRABI') {
    throw new Error('จัดเตรียมเอกสารได้เฉพาะสถานะรอจัดส่งเอกสาร');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      is_document_ready: true,
      document_prepared_at: nowIso,
      planned_dispatch_date: calculateNextPlannedDispatchDate(new Date()),
      updated_at: nowIso
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }
  finalizeWorkflowAction(requestId, formData);
}

export async function markSentToKrabiAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const dispatcherName = requiredField(formData, 'dispatcher_name');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase.from('service_requests').select('id,status,request_type,is_document_ready').eq('id', requestId).single();
  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }
  assertExpansionWorkflowAllowed({
    request_type: request.request_type as RequestType,
    status: request.status as RequestStatus
  });
  if (request.status !== 'WAITING_TO_SEND_TO_KRABI') {
    throw new Error('บันทึกส่งเอกสารได้เฉพาะสถานะรอจัดส่งเอกสาร');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: 'SENT_TO_KRABI',
      dispatched_to_krabi_at: nowIso,
      dispatched_to_krabi_by: dispatcherName,
      krabi_received_at: nowIso,
      reject_reason: null,
      rejected_by: null,
      rejected_at: null,
      updated_at: nowIso
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }
  finalizeWorkflowAction(requestId, formData);
}

export async function markKrabiInProgressAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,request_type,three_phase_capability_result')
    .eq('id', requestId)
    .single();
  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }
  assertExpansionWorkflowAllowed({
    request_type: request.request_type as RequestType,
    status: request.status as RequestStatus,
    three_phase_capability_result: request.three_phase_capability_result
  });
  if (!['WAIT_KRABI_DOCUMENT_CHECK', 'SENT_TO_KRABI'].includes(request.status)) {
    throw new Error('ต้องอยู่ขั้นรอกระบี่ตรวจรับเอกสารก่อน');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: 'KRABI_IN_PROGRESS',
      krabi_in_progress_at: nowIso,
      reject_reason: null,
      rejected_by: null,
      rejected_at: null,
      updated_at: nowIso
    })
    .eq('id', requestId);
  if (error) {
    throw new Error(error.message);
  }
  finalizeWorkflowAction(requestId, formData);
}

export async function markKrabiNeedsDocumentFixAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const reason = requiredOneOfFields(formData, ['reject_reason', 'return_reason', 'revision_note']);
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,request_type,three_phase_capability_result')
    .eq('id', requestId)
    .single();
  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }
  assertExpansionWorkflowAllowed({
    request_type: request.request_type as RequestType,
    status: request.status as RequestStatus,
    three_phase_capability_result: request.three_phase_capability_result
  });
  if (!['WAIT_KRABI_DOCUMENT_CHECK', 'SENT_TO_KRABI'].includes(request.status)) {
    throw new Error('ต้องอยู่ขั้นรอกระบี่ตรวจรับเอกสารก่อน');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: 'KRABI_NEEDS_DOCUMENT_FIX',
      incomplete_docs_note: reason,
      reject_reason: reason,
      rejected_by: 'กระบี่',
      rejected_at: nowIso,
      updated_at: nowIso
    })
    .eq('id', requestId);
  if (error) {
    throw new Error(error.message);
  }
  finalizeWorkflowAction(requestId, formData);
}

export async function markKrabiDocumentFixCompletedAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,request_type,three_phase_capability_result')
    .eq('id', requestId)
    .single();
  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }
  assertExpansionWorkflowAllowed({
    request_type: request.request_type as RequestType,
    status: request.status as RequestStatus,
    three_phase_capability_result: request.three_phase_capability_result
  });
  if (request.status !== 'KRABI_NEEDS_DOCUMENT_FIX') {
    throw new Error('ต้องอยู่สถานะกระบี่ตีกลับให้แก้ไขเอกสารก่อน');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: 'WAITING_TO_SEND_TO_KRABI',
      is_document_ready: true,
      document_prepared_at: nowIso,
      planned_dispatch_date: null,
      dispatched_to_krabi_at: null,
      dispatched_to_krabi_by: null,
      krabi_received_at: null,
      reject_reason: null,
      rejected_by: null,
      rejected_at: null,
      updated_at: nowIso
    })
    .eq('id', requestId);
  if (error) {
    throw new Error(error.message);
  }
  finalizeWorkflowAction(requestId, formData);
}

export async function markKrabiEstimationCompletedAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,request_type,three_phase_capability_result')
    .eq('id', requestId)
    .single();
  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }
  assertExpansionWorkflowAllowed({
    request_type: request.request_type as RequestType,
    status: request.status as RequestStatus,
    three_phase_capability_result: request.three_phase_capability_result
  });
  if (request.status !== 'KRABI_IN_PROGRESS') {
    throw new Error('ต้องเริ่มดำเนินการที่กระบี่ก่อนจึงจะปิดงานประมาณการได้');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({ status: 'KRABI_ESTIMATION_COMPLETED', krabi_completed_at: nowIso, updated_at: nowIso })
    .eq('id', requestId);
  if (error) {
    throw new Error(error.message);
  }
  finalizeWorkflowAction(requestId, formData);
}

export async function markCoordinatedWithConstructionAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,request_type,three_phase_capability_result')
    .eq('id', requestId)
    .single();
  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }
  assertExpansionWorkflowAllowed({
    request_type: request.request_type as RequestType,
    status: request.status as RequestStatus,
    three_phase_capability_result: request.three_phase_capability_result
  });
  if (request.status !== 'KRABI_ESTIMATION_COMPLETED') {
    throw new Error('ประสานก่อสร้างได้เฉพาะงานที่กระบี่ประมาณการเสร็จแล้ว');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({ status: resolveExpansionPostEstimationStatus(), updated_at: nowIso })
    .eq('id', requestId);
  if (error) {
    throw new Error(error.message);
  }
  finalizeWorkflowAction(requestId, formData);
}


export async function markThreePhaseCapabilitySupportedAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const surveyNote = optionalField(formData, 'survey_note');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();
  console.info('[meter-3phase-supported-action-start]', {
    requestId,
    hasSurveyNote: Boolean(surveyNote),
    returnTo: formData.get('return_to')?.toString() ?? null,
    stayOnQueue: formData.get('stay_on_queue')?.toString() === '1'
  });

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,request_type,three_phase_capability_result,survey_note')
    .eq('id', requestId)
    .single();
  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  console.info('[meter-3phase-supported-action-transition]', {
    requestId,
    currentStatus: request.status,
    requestType: request.request_type,
    currentCapability: request.three_phase_capability_result ?? null,
    targetStatus: resolveThreePhaseCapabilityStatus(
      request.request_type as Extract<RequestType, 'METER_TO_3PHASE' | 'METER_30_100_3P'>,
      'SUPPORTED'
    ),
    targetCapability: 'SUPPORTED'
  });

  if (request.three_phase_capability_result === 'SUPPORTED') {
    console.info('[meter-3phase-supported-action-success]', {
      requestId,
      skippedUpdate: true,
      reason: 'already-supported'
    });
    finalizeWorkflowAction(requestId, formData);
    return;
  }

  if (
    // 30/100 (3 เฟส) reuses the exact 30/100 (1-phase) meter workflow after the 3-phase support check passes.
    !canEvaluateThreePhaseCapability({
      status: request.status as RequestStatus,
      request_type: request.request_type as RequestType,
      three_phase_capability_result: request.three_phase_capability_result
    })
  ) {
    throw new Error('ยืนยันความพร้อมระบบ 3 เฟสได้เฉพาะงานเพิ่มเป็นมิเตอร์ 3 เฟสที่กำลังสำรวจอยู่');
  }

  const capabilityNote = 'ตรวจสอบแล้วระบบรองรับ 3 เฟส';
  const mergedSurveyNote = [request.survey_note, surveyNote, capabilityNote].filter(Boolean).join('\n');

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: resolveThreePhaseCapabilityStatus(
        request.request_type as Extract<RequestType, 'METER_TO_3PHASE' | 'METER_30_100_3P'>,
        'SUPPORTED'
      ),
      three_phase_capability_result: 'SUPPORTED',
      flow_type: 'METER',
      three_phase_capability_checked_at: nowIso,
      survey_result: 'PASS',
      survey_completed_at: nowIso,
      survey_note: mergedSurveyNote || null,
      updated_at: nowIso
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  console.info('[meter-3phase-supported-action-success]', {
    requestId,
    skippedUpdate: false,
    nextStatus: resolveThreePhaseCapabilityStatus(
      request.request_type as Extract<RequestType, 'METER_TO_3PHASE' | 'METER_30_100_3P'>,
      'SUPPORTED'
    ),
    nextCapability: 'SUPPORTED'
  });
  finalizeWorkflowAction(requestId, formData);
}

export async function forwardThreePhaseToExpansionAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,request_type,survey_note,three_phase_capability_result')
    .eq('id', requestId)
    .single();
  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if (!['METER_TO_3PHASE', 'METER_30_100_3P'].includes(request.request_type as RequestType) || !['IN_SURVEY', 'CHECK_3PHASE_CAPABILITY'].includes(request.status) || request.three_phase_capability_result === 'SUPPORTED') {
    throw new Error('ส่งต่อไปงานขยายเขตได้เฉพาะงานเพิ่มเป็นมิเตอร์ 3 เฟสที่อยู่ขั้นกำลังสำรวจ');
  }

  const timelineNote = 'ระบบไม่รองรับ 3 เฟส จึงส่งต่อเข้าสู่ขั้นตอนขยายเขต ที่สถานะ WAIT_LAYOUT_DRAWING';
  const mergedNote = request.survey_note ? `${request.survey_note}
${timelineNote}` : timelineNote;

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: resolveThreePhaseCapabilityStatus(
        request.request_type as Extract<RequestType, 'METER_TO_3PHASE' | 'METER_30_100_3P'>,
        'UNSUPPORTED'
      ),
      flow_type: 'EXPANSION',
      survey_result: 'FAIL',
      survey_completed_at: nowIso,
      three_phase_capability_result: 'UNSUPPORTED',
      three_phase_capability_checked_at: nowIso,
      forwarded_to_expansion_at: nowIso,
      forwarded_to_expansion_note: timelineNote,
      survey_note: mergedNote,
      updated_at: nowIso
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  finalizeWorkflowAction(requestId, formData);
}

export async function completeThreePhaseDesignEstimateAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data: request, error: requestError } = await supabase.from('service_requests').select('id,status,request_type').eq('id', requestId).single();
  if (requestError || !request) throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  if ((request.request_type as RequestType) !== 'METER_TO_3PHASE' || request.status !== 'DESIGN_AND_ESTIMATE') throw new Error('ขั้นตอนนี้ใช้ได้เฉพาะงานเพิ่มเป็นมิเตอร์ 3 เฟสที่อยู่ขั้นออกแบบ/ประเมิน');
  const { error } = await supabase.from('service_requests').update({ status: 'WAIT_MANAGER_REVIEW', updated_at: nowIso }).eq('id', requestId);
  if (error) throw new Error(error.message);
  finalizeWorkflowAction(requestId, formData);
}

export async function completeThreePhaseInstallationAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data: request, error: requestError } = await supabase.from('service_requests').select('id,status,request_type').eq('id', requestId).single();
  if (requestError || !request) throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  if ((request.request_type as RequestType) !== 'METER_TO_3PHASE' || request.status !== 'INSTALLATION') throw new Error('บันทึกติดตั้งได้เฉพาะงานเพิ่มเป็นมิเตอร์ 3 เฟสที่อยู่ขั้นติดตั้ง');
  const { error } = await supabase.from('service_requests').update({ status: 'INSPECTION', updated_at: nowIso }).eq('id', requestId);
  if (error) throw new Error(error.message);
  finalizeWorkflowAction(requestId, formData);
}

export async function completeThreePhaseInspectionAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data: request, error: requestError } = await supabase.from('service_requests').select('id,status,request_type').eq('id', requestId).single();
  if (requestError || !request) throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  if ((request.request_type as RequestType) !== 'METER_TO_3PHASE' || request.status !== 'INSPECTION') throw new Error('บันทึกตรวจสอบได้เฉพาะงานเพิ่มเป็นมิเตอร์ 3 เฟสที่อยู่ขั้นตรวจสอบหลังติดตั้ง');
  const { error } = await supabase.from('service_requests').update({ status: 'COMPLETED', updated_at: nowIso }).eq('id', requestId);
  if (error) throw new Error(error.message);
  finalizeWorkflowAction(requestId, formData);
}

type SurveyVerificationMode = 'PHOTO_OR_RESURVEY' | 'RESURVEY_ONLY';
type SurveyFailureType = 'NORMAL_FIX_REQUIRED' | 'OVERLOAD_REPORTED';

function isSurveyVerificationMode(value: string): value is SurveyVerificationMode {
  return ['PHOTO_OR_RESURVEY', 'RESURVEY_ONLY'].includes(value);
}

function isSurveyFailureType(value: string): value is SurveyFailureType {
  return ['NORMAL_FIX_REQUIRED', 'OVERLOAD_REPORTED'].includes(value);
}

export async function markSurveyPassedAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const surveyNote = optionalField(formData, 'survey_note');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,request_type,three_phase_capability_result')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if (!canMarkSurveyPassed({ status: request.status as RequestStatus, request_type: request.request_type as RequestType })) {
    throw new Error('ยืนยันสำรวจผ่านได้เฉพาะงานขอมิเตอร์/เพิ่มเป็นมิเตอร์ 3 เฟส ที่กำลังสำรวจอยู่');
  }
  if (['METER_TO_3PHASE', 'METER_30_100_3P'].includes(request.request_type as RequestType) && request.three_phase_capability_result !== 'SUPPORTED') {
    throw new Error('ต้องยืนยันว่าระบบรองรับ 3 เฟสก่อน จึงจะสรุปผลสำรวจผ่าน/ไม่ผ่านได้');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: resolvePassedSurveyStatus(request.request_type as RequestType),
      survey_result: 'PASS',
      survey_failure_type: null,
      fix_approved_via: 'RESURVEY',
      survey_note: surveyNote,
      survey_completed_at: nowIso,
      overload_report_reason: null,
      overload_report_note: null,
      overload_reported_at: null,
      overload_reported_by: null,
      manager_overload_approved_at: null,
      manager_overload_approved_by: null,
      photo_review_status: null,
      photo_reviewed_at: null,
      photo_reviewed_by: null,
      updated_at: nowIso
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  finalizeWorkflowAction(requestId, formData);
}

export async function markSurveyFailedAction(formData: FormData) {
  const payload = snapshotFormData(formData);
  console.info('[markSurveyFailedAction] incoming payload', payload);

  const requestId = requiredField(formData, 'request_id');
  const surveyFailureTypeRaw = formData.get('survey_failure_type')?.toString().trim() ?? 'NORMAL_FIX_REQUIRED';
  const surveyNote = optionalField(formData, 'survey_note');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();
  console.info('[markSurveyFailedAction] parsed base fields', {
    requestId,
    surveyFailureTypeRaw,
    hasSurveyNote: Boolean(surveyNote),
    actionIntent: formData.get('action_intent')?.toString() ?? null,
    actionBranch: formData.get('action_branch')?.toString() ?? null
  });

  if (!isSurveyFailureType(surveyFailureTypeRaw)) {
    throw new Error('ประเภทผลสำรวจไม่ผ่านไม่ถูกต้อง');
  }

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,request_type,three_phase_capability_result')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  console.info('[markSurveyFailedAction] current request state', {
    requestId: request.id,
    status: request.status,
    requestType: request.request_type,
    threePhaseCapabilityResult: request.three_phase_capability_result
  });

  if (!canMarkSurveyFailed({ status: request.status as RequestStatus, request_type: request.request_type as RequestType })) {
    throw new Error('บันทึกผลสำรวจไม่ผ่านได้เฉพาะงานขอมิเตอร์/เพิ่มเป็นมิเตอร์ 3 เฟส ที่กำลังสำรวจอยู่');
  }
  if (['METER_TO_3PHASE', 'METER_30_100_3P'].includes(request.request_type as RequestType) && request.three_phase_capability_result !== 'SUPPORTED') {
    throw new Error('ต้องยืนยันว่าระบบรองรับ 3 เฟสก่อน จึงจะสรุปผลสำรวจผ่าน/ไม่ผ่านได้');
  }

  if (surveyFailureTypeRaw === 'OVERLOAD_REPORTED') {
    const overloadReportReason = requiredField(formData, 'overload_report_reason');
    const overloadReportNote = optionalField(formData, 'overload_report_note');
    const overloadReportedBy = requiredOneOfFields(formData, ['overload_reported_by', 'reported_by', 'actor_name']);
    console.info('[markSurveyFailedAction] branch OVERLOAD_REPORTED', {
      requestId,
      overloadReportedBy,
      hasOverloadReportReason: Boolean(overloadReportReason),
      hasOverloadReportNote: Boolean(overloadReportNote)
    });

    console.info('[markSurveyFailedAction] updating DB for OVERLOAD_REPORTED', {
      requestId,
      nextStatus: 'SURVEY_OVERLOAD_REPORTED'
    });

    const { error } = await supabase
      .from('service_requests')
      .update({
        status: 'SURVEY_OVERLOAD_REPORTED',
        survey_result: 'FAIL',
        survey_failure_type: 'OVERLOAD_REPORTED',
        overload_report_reason: overloadReportReason,
        overload_report_note: overloadReportNote,
        overload_reported_at: nowIso,
        overload_reported_by: overloadReportedBy,
        manager_overload_approved_at: null,
        manager_overload_approved_by: null,
        survey_note: surveyNote,
        survey_completed_at: nowIso,
        customer_fix_note: null,
        customer_fix_reported_at: null,
        fix_verification_mode: null,
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

    console.info('[markSurveyFailedAction] DB update success', {
      requestId,
      nextStatus: 'SURVEY_OVERLOAD_REPORTED',
      nextSurveyFailureType: 'OVERLOAD_REPORTED'
    });
    console.info('[markSurveyFailedAction] finalizing workflow action', { requestId });
    finalizeWorkflowAction(requestId, formData);
    return;
  }

  const customerFixNote = requiredField(formData, 'customer_fix_note');
  const fixVerificationMode = requiredField(formData, 'fix_verification_mode');
  console.info('[markSurveyFailedAction] branch NORMAL_FIX_REQUIRED', {
    requestId,
    hasCustomerFixNote: Boolean(customerFixNote),
    fixVerificationMode
  });

  if (!isSurveyVerificationMode(fixVerificationMode)) {
    throw new Error('รูปแบบการตรวจหลังแก้ไขไม่ถูกต้อง');
  }

  console.info('[markSurveyFailedAction] updating DB for NORMAL_FIX_REQUIRED', {
    requestId,
    nextStatus: 'WAIT_CUSTOMER_FIX'
  });

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: 'WAIT_CUSTOMER_FIX',
      survey_result: 'FAIL',
      survey_failure_type: 'NORMAL_FIX_REQUIRED',
      customer_fix_note: customerFixNote,
      fix_verification_mode: fixVerificationMode,
      overload_report_reason: null,
      overload_report_note: null,
      overload_reported_at: null,
      overload_reported_by: null,
      manager_overload_approved_at: null,
      manager_overload_approved_by: null,
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

  console.info('[markSurveyFailedAction] DB update success', {
    requestId,
    nextStatus: 'WAIT_CUSTOMER_FIX',
    nextSurveyFailureType: 'NORMAL_FIX_REQUIRED'
  });
  console.info('[markSurveyFailedAction] finalizing workflow action', { requestId });
  finalizeWorkflowAction(requestId, formData);
}

export async function markSurveyFailedActionSafe(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await markSurveyFailedAction(formData);
    return { ok: true };
  } catch (error) {
    const redirectDigest = typeof error === 'object' && error && 'digest' in error ? (error as { digest?: unknown }).digest : null;
    if (typeof redirectDigest === 'string' && redirectDigest.startsWith('NEXT_REDIRECT')) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'ไม่สามารถบันทึกผลสำรวจไม่ผ่านได้';
    console.error('[markSurveyFailedActionSafe] action failed', {
      message,
      payload: snapshotFormData(formData)
    });
    return { ok: false, error: message };
  }
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

  if (!['METER', 'METER_30_100_1P', 'METER_30_100_3P', 'METER_TO_3PHASE'].includes(request.request_type as RequestType)) {
    throw new Error('action นี้รองรับเฉพาะงานขอมิเตอร์และงานเพิ่มเป็นมิเตอร์ 3 เฟส');
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

  finalizeWorkflowAction(requestId, formData);
}

export async function moveToResurveyAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: request, error: requestError } = await supabase.from('service_requests').select('id,status,request_type').eq('id', requestId).single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if (!['METER', 'METER_30_100_1P', 'METER_30_100_3P', 'METER_TO_3PHASE'].includes(request.request_type as RequestType)) {
    throw new Error('action นี้รองรับเฉพาะงานขอมิเตอร์และงานเพิ่มเป็นมิเตอร์ 3 เฟส');
  }

  if (!['WAIT_CUSTOMER_FIX', 'WAIT_FIX_REVIEW'].includes(request.status)) {
    throw new Error('นัดตรวจซ้ำได้เฉพาะสถานะรอผู้ใช้ไฟแก้ไข หรือรอตรวจจากรูป');
  }

  const { error } = await supabase.from('service_requests').update({ status: 'READY_FOR_RESURVEY', updated_at: nowIso }).eq('id', requestId);
  if (error) {
    throw new Error(error.message);
  }
  finalizeWorkflowAction(requestId, formData);
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

  if (!['METER', 'METER_30_100_1P', 'METER_30_100_3P', 'METER_TO_3PHASE'].includes(request.request_type as RequestType)) {
    throw new Error('action นี้รองรับเฉพาะงานขอมิเตอร์และงานเพิ่มเป็นมิเตอร์ 3 เฟส');
  }

  if (!canApproveFixFromPhoto({ status: request.status as RequestStatus, fix_verification_mode: request.fix_verification_mode })) {
    throw new Error('อนุมัติผ่านจากรูปได้เฉพาะงานที่รอตรวจจากรูป และเคสที่อนุญาตให้ใช้รูป');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: resolvePassedSurveyStatus(request.request_type as RequestType),
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

  finalizeWorkflowAction(requestId, formData);
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

  if (!['METER', 'METER_30_100_1P', 'METER_30_100_3P', 'METER_TO_3PHASE'].includes(request.request_type as RequestType)) {
    throw new Error('action นี้รองรับเฉพาะงานขอมิเตอร์และงานเพิ่มเป็นมิเตอร์ 3 เฟส');
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

  finalizeWorkflowAction(requestId, formData);
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

  finalizeWorkflowAction(requestId, formData);
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
    .update({ status: 'WAIT_MANAGER_REVIEW', document_status: 'COMPLETE', updated_at: nowIso })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  finalizeWorkflowAction(requestId, formData);
}

export async function approveAonangManagerPreKrabiAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data: request, error: requestError } = await supabase.from('service_requests').select('id,status,request_type').eq('id', requestId).single();
  if (requestError || !request) throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  console.info('[manager-action] approveAonangManagerPreKrabiAction', { requestId, currentStatus: request.status, requestType: request.request_type });
  if (!['METER_30_100_1P', 'METER_30_100_3P'].includes(request.request_type as RequestType) || request.status !== 'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL') throw new Error('อนุมัติก่อนส่งกระบี่ได้เฉพาะงานขอมิเตอร์ 30/100 ที่รอผู้จัดการอ่าวนาง');
  const { error } = await supabase.from('service_requests').update({ status: 'SENT_TO_KRABI', updated_at: nowIso }).eq('id', requestId);
  if (error) throw new Error(error.message);
  finalizeWorkflowAction(requestId, formData);
}

export async function moveToWaitKrabiApprovalAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data: request, error: requestError } = await supabase.from('service_requests').select('id,status,request_type').eq('id', requestId).single();
  if (requestError || !request) throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  if (!['METER_30_100_1P', 'METER_30_100_3P'].includes(request.request_type as RequestType) || !['SENT_TO_KRABI', 'RESENT_TO_KRABI'].includes(request.status)) throw new Error('ยืนยันรอกระบี่อนุมัติได้เฉพาะงานขอมิเตอร์ที่ส่งเอกสารไปกระบี่แล้ว');
  const { error } = await supabase.from('service_requests').update({ status: 'WAIT_KRABI_APPROVAL', updated_at: nowIso }).eq('id', requestId);
  if (error) throw new Error(error.message);
  finalizeWorkflowAction(requestId, formData);
}

export async function markKrabiApprovedForMeterAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data: request, error: requestError } = await supabase.from('service_requests').select('id,status,request_type').eq('id', requestId).single();
  if (requestError || !request) throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  if (!['METER_30_100_1P', 'METER_30_100_3P'].includes(request.request_type as RequestType) || request.status !== 'WAIT_KRABI_APPROVAL') throw new Error('บันทึกว่ากระบี่อนุมัติได้เฉพาะงานขอมิเตอร์ที่รอกระบี่อนุมัติ');
  const { error } = await supabase.from('service_requests').update({ status: 'KRABI_APPROVED', updated_at: nowIso }).eq('id', requestId);
  if (error) throw new Error(error.message);
  finalizeWorkflowAction(requestId, formData);
}

export async function markKrabiRejectedForMeterAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const rejectReason = optionalField(formData, 'reject_reason');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data: request, error: requestError } = await supabase.from('service_requests').select('id,status,request_type').eq('id', requestId).single();
  if (requestError || !request) throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  if (!['METER_30_100_1P', 'METER_30_100_3P'].includes(request.request_type as RequestType) || request.status !== 'WAIT_KRABI_APPROVAL') throw new Error('บันทึกว่ากระบี่ตีกลับได้เฉพาะงานขอมิเตอร์ที่รอกระบี่อนุมัติ');
  const { error } = await supabase.from('service_requests').update({ status: 'KRABI_NEEDS_CORRECTION', reject_reason: rejectReason, rejected_at: nowIso, rejected_by: 'กระบี่', updated_at: nowIso }).eq('id', requestId);
  if (error) throw new Error(error.message);
  finalizeWorkflowAction(requestId, formData);
}

export async function startDocumentFixForMeterAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data: request, error: requestError } = await supabase.from('service_requests').select('id,status,request_type').eq('id', requestId).single();
  if (requestError || !request) throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  if (!['METER_30_100_1P', 'METER_30_100_3P'].includes(request.request_type as RequestType) || request.status !== 'KRABI_NEEDS_CORRECTION') throw new Error('แก้ไขเอกสารได้เฉพาะงานขอมิเตอร์ที่ถูกกระบี่ตีกลับ');
  const { error } = await supabase.from('service_requests').update({ status: 'DOCUMENT_FIX', updated_at: nowIso }).eq('id', requestId);
  if (error) throw new Error(error.message);
  finalizeWorkflowAction(requestId, formData);
}

export async function resendToKrabiForMeterAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data: request, error: requestError } = await supabase.from('service_requests').select('id,status,request_type').eq('id', requestId).single();
  if (requestError || !request) throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  if (!['METER_30_100_1P', 'METER_30_100_3P'].includes(request.request_type as RequestType) || request.status !== 'DOCUMENT_FIX') throw new Error('ส่งเอกสารไปกระบี่ใหม่ได้เฉพาะงานขอมิเตอร์ที่อยู่ขั้นแก้ไขเอกสาร');
  const { error } = await supabase.from('service_requests').update({ status: 'RESENT_TO_KRABI', updated_at: nowIso }).eq('id', requestId);
  if (error) throw new Error(error.message);
  finalizeWorkflowAction(requestId, formData);
}

export async function receiveFromKrabiForMeterAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data: request, error: requestError } = await supabase.from('service_requests').select('id,status,request_type').eq('id', requestId).single();
  if (requestError || !request) throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  if (!['METER_30_100_1P', 'METER_30_100_3P'].includes(request.request_type as RequestType) || request.status !== 'KRABI_APPROVED') throw new Error('รับเอกสารกลับจากกระบี่ได้เฉพาะงานขอมิเตอร์ที่กระบี่อนุมัติแล้ว');
  const { error } = await supabase.from('service_requests').update({ status: 'WAIT_ELIGIBILITY_REVIEW', updated_at: nowIso }).eq('id', requestId);
  if (error) throw new Error(error.message);
  finalizeWorkflowAction(requestId, formData);
}

export async function sendToEligibilityReviewForMeterAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data: request, error: requestError } = await supabase.from('service_requests').select('id,status,request_type').eq('id', requestId).single();
  if (requestError || !request) throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  if (!['METER_30_100_1P', 'METER_30_100_3P'].includes(request.request_type as RequestType) || request.status !== 'WAIT_RECEIVE_FROM_KRABI') throw new Error('ส่งเข้าตรวจสอบสิทธิ์ได้เฉพาะงานขอมิเตอร์ที่รับเอกสารกลับจากกระบี่แล้ว');
  const { error } = await supabase.from('service_requests').update({ status: 'WAIT_ELIGIBILITY_REVIEW', updated_at: nowIso }).eq('id', requestId);
  if (error) throw new Error(error.message);
  finalizeWorkflowAction(requestId, formData);
}

export async function markEligibilityPassedForMeterAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data: request, error: requestError } = await supabase.from('service_requests').select('id,status,request_type').eq('id', requestId).single();
  if (requestError || !request) throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  if (!['METER_30_100_1P', 'METER_30_100_3P'].includes(request.request_type as RequestType) || request.status !== 'WAIT_ELIGIBILITY_REVIEW') throw new Error('บันทึกผลตรวจสอบสิทธิ์ได้เฉพาะงานขอมิเตอร์ที่อยู่ขั้นตรวจสอบสิทธิ์');
  const { error } = await supabase.from('service_requests').update({ status: resolveEligibilityReviewStatus(true), updated_at: nowIso }).eq('id', requestId);
  if (error) throw new Error(error.message);
  finalizeWorkflowAction(requestId, formData);
}

export async function markEligibilityFailedForMeterAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data: request, error: requestError } = await supabase.from('service_requests').select('id,status,request_type').eq('id', requestId).single();
  if (requestError || !request) throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  if (!['METER_30_100_1P', 'METER_30_100_3P'].includes(request.request_type as RequestType) || request.status !== 'WAIT_ELIGIBILITY_REVIEW') throw new Error('บันทึกผลตรวจสอบสิทธิ์ได้เฉพาะงานขอมิเตอร์ที่อยู่ขั้นตรวจสอบสิทธิ์');
  const { error } = await supabase.from('service_requests').update({ status: resolveEligibilityReviewStatus(false), updated_at: nowIso }).eq('id', requestId);
  if (error) throw new Error(error.message);
  finalizeWorkflowAction(requestId, formData);
}

export async function approveAonangManagerFinalAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data: request, error: requestError } = await supabase.from('service_requests').select('id,status,request_type').eq('id', requestId).single();
  if (requestError || !request) throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  if (!['METER_30_100_1P', 'METER_30_100_3P'].includes(request.request_type as RequestType) || request.status !== 'WAIT_AONANG_MANAGER_FINAL_APPROVAL') throw new Error('อนุมัติปิดงานได้เฉพาะงานขอมิเตอร์ที่รออนุมัติรอบสุดท้าย');
  const { error } = await supabase.from('service_requests').update({ status: 'COMPLETED', updated_at: nowIso }).eq('id', requestId);
  if (error) throw new Error(error.message);
  finalizeWorkflowAction(requestId, formData);
}

export async function updateRequestAssigneeAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const assigneeId = requiredField(formData, 'assignee_id');

  const supabase = createServerSupabaseClient();
  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,area_code')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'Request not found');
  }

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
      assigned_surveyor_id: assignee.id,
      assigned_surveyor: assignee.name,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateRequestPaths(requestId);
  redirect(`/requests/${requestId}`);
}

export async function markSurveyNeedsExpansionAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const reason = requiredField(formData, 'survey_expansion_reason');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,request_type,status,survey_note')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if (!REQUEST_TYPES_CONVERTIBLE_TO_EXPANSION.includes(request.request_type as RequestType)) {
    throw new Error('บันทึกผลสำรวจว่าต้องขยายเขตได้เฉพาะคำร้องขอมิเตอร์ใหม่ หรือขอมิเตอร์ 30/100 1 เฟสเท่านั้น');
  }

  if (request.status !== 'IN_SURVEY') {
    throw new Error('บันทึกผลสำรวจว่าต้องขยายเขตได้เฉพาะงานที่อยู่ในขั้นตอนสำรวจเท่านั้น');
  }

  const actorLabel = user?.email ? `โดย: ${user.email}` : 'โดย: ผู้ใช้งานปัจจุบัน';
  const auditNote = [
    'ผลสำรวจ: ต้องขยายเขต',
    'เปลี่ยนเส้นทางจาก Flow ขอมิเตอร์ใหม่ ไป Flow ขยายเขต',
    `previous_request_type: ${request.request_type}`,
    `เหตุผล: ${reason}`,
    actorLabel,
    `เวลา: ${formatActionTimestamp(nowIso)}`
  ].join('\n');
  const surveyExpansionNote = [`ผลสำรวจ: ต้องขยายเขต`, `เหตุผล: ${reason}`].join('\n');
  const mergedSurveyNote = [request.survey_note, surveyExpansionNote].filter(Boolean).join('\n');

  const { data: updatedRequest, error } = await supabase
    .from('service_requests')
    .update({
      request_type: 'EXPANSION',
      request_intent: 'EXPANSION',
      flow_type: 'EXPANSION',
      status: 'WAIT_LAYOUT_DRAWING',
      survey_completed_at: nowIso,
      survey_note: mergedSurveyNote || null,
      forwarded_to_expansion_at: nowIso,
      forwarded_to_expansion_note: auditNote,
      updated_at: nowIso
    })
    .eq('id', requestId)
    .in('request_type', REQUEST_TYPES_CONVERTIBLE_TO_EXPANSION)
    .eq('status', 'IN_SURVEY')
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!updatedRequest) {
    throw new Error('ไม่สามารถบันทึกผลสำรวจว่าต้องขยายเขตได้ เนื่องจากข้อมูลคำร้องมีการเปลี่ยนแปลง กรุณารีเฟรชหน้าแล้วลองใหม่');
  }

  finalizeWorkflowAction(requestId, formData);
}

export async function approveManagerReviewAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
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

  console.info('[manager-action] approveManagerReviewAction', {
    requestId,
    currentStatus: request.status,
    requestType: request.request_type
  });

  if (!isValidRequestStatus(request.status)) {
    throw new Error('สถานะปัจจุบันไม่ถูกต้อง');
  }

  if (!['METER', 'METER_TO_3PHASE'].includes(request.request_type as RequestType)) {
    throw new Error('ขั้นตรวจสอบการเงินและอนุมัติติดตั้งรองรับเฉพาะงานขอมิเตอร์ทั่วไปและงานเพิ่มเป็นมิเตอร์ 3 เฟส');
  }

  if (request.status !== 'WAIT_MANAGER_REVIEW') {
    throw new Error('ผู้จัดการอนุมัติได้เฉพาะงานที่รอผู้จัดการตรวจ');
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

  finalizeWorkflowAction(requestId, formData);
}


const MANAGER_RESURVEY_CHECKLIST_KEYS = [
  'METER_SIZE',
  'PHASE_COUNT',
  'ACTUAL_LOAD',
  'INSTALLATION_POINT',
  'CABLE_DISTANCE',
  'SITE_PHOTOS',
  'DOCUMENT_ACCURACY',
  'THREE_PHASE_CAPABILITY',
  'EXPANSION_REQUIRED',
  'OTHER'
] as const;

type ManagerResurveyChecklistKey = (typeof MANAGER_RESURVEY_CHECKLIST_KEYS)[number];

function parseManagerResurveyChecklist(formData: FormData): ManagerResurveyChecklistKey[] {
  return formData
    .getAll('manager_return_checklist')
    .map((value) => value.toString().trim())
    .filter((value): value is ManagerResurveyChecklistKey => MANAGER_RESURVEY_CHECKLIST_KEYS.includes(value as ManagerResurveyChecklistKey));
}

export async function returnRequestForResurveyAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const managerReturnReason = optionalField(formData, 'manager_return_reason');
  const managerReturnedBy = requiredOneOfFields(formData, ['manager_returned_by', 'actor_name']);
  const managerReturnChecklist = parseManagerResurveyChecklist(formData);
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  if (!managerReturnReason && managerReturnChecklist.length === 0) {
    throw new Error('กรุณาระบุสิ่งที่ต้องตรวจสอบเพิ่มเติมอย่างน้อย 1 รายการ');
  }

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,request_type,survey_round,scheduled_survey_date,survey_date_current')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if (!isThirtyOneHundredRequestType(request.request_type as RequestType)) {
    throw new Error('ส่งกลับตรวจสอบใหม่ได้เฉพาะงานขอมิเตอร์ 30/100');
  }

  if (request.status !== 'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL') {
    throw new Error('ส่งกลับตรวจสอบใหม่ได้เฉพาะงานที่อยู่คิวผู้จัดการ');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: 'RETURNED_FOR_RESURVEY',
      assigned_surveyor_id: null,
      assigned_surveyor: null,
      scheduled_survey_date: null,
      previous_survey_date: getEffectiveSurveyDate(request),
      survey_date_current: null,
      manager_return_reason: managerReturnReason,
      manager_return_checklist: managerReturnChecklist,
      manager_returned_by: managerReturnedBy,
      manager_returned_at: nowIso,
      survey_round: ((request.survey_round as number | null) ?? 1) + 1,
      updated_at: nowIso
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  finalizeWorkflowAction(requestId, formData);
}

export async function restartReturnedResurveyAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const assignedSurveyor = requiredField(formData, 'assigned_surveyor');
  const scheduledSurveyDate = requiredField(formData, 'scheduled_survey_date');
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

  if (!isThirtyOneHundredRequestType(request.request_type as RequestType) || request.status !== 'RETURNED_FOR_RESURVEY') {
    throw new Error('เริ่มรอบสำรวจใหม่ได้เฉพาะงาน 30/100 ที่ถูกส่งกลับให้สำรวจใหม่');
  }

  if (!isValidDateOnly(scheduledSurveyDate)) {
    throw new Error('รูปแบบวันสำรวจไม่ถูกต้อง');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: 'READY_FOR_SURVEY',
      assigned_surveyor: assignedSurveyor,
      scheduled_survey_date: scheduledSurveyDate,
      survey_date_initial: scheduledSurveyDate,
      survey_date_current: scheduledSurveyDate,
      survey_rescheduled_at: null,
      survey_reschedule_reason: null,
      updated_at: nowIso
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  finalizeWorkflowAction(requestId, formData);
}

export async function approveManagerOverloadForwardAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const approvedBy = requiredOneOfFields(formData, ['manager_overload_approved_by', 'approved_by', 'actor_name']);
  const krabiReferenceNo = optionalField(formData, 'krabi_reference_no');
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,status,survey_failure_type,overload_report_reason')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? 'ไม่พบคำร้อง');
  }

  if (request.status !== 'SURVEY_OVERLOAD_REPORTED') {
    throw new Error('อนุมัติบันทึกโหลดเกินได้เฉพาะงานที่รออนุมัติบันทึกโหลดเกิน');
  }

  if (request.survey_failure_type !== 'OVERLOAD_REPORTED' || !request.overload_report_reason) {
    throw new Error('ไม่พบข้อมูลบันทึกโหลดเกินของคำร้องนี้');
  }

  if (!krabiReferenceNo) {
    throw new Error('กรุณากรอกเลขที่หนังสือก่อนอนุมัติ');
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      status: 'COMPLETED',
      manager_overload_approved_at: nowIso,
      manager_overload_approved_by: approvedBy,
      krabi_reference_no: krabiReferenceNo,
      krabi_submitted_at: nowIso,
      krabi_submitted_by: user?.id ?? null,
      updated_at: nowIso
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  finalizeWorkflowAction(requestId, formData);
}
