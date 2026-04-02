'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { generateRequestNo } from '@/lib/requests/generateRequestNo';
import { REQUEST_STATUSES, REQUEST_TYPES } from '@/lib/requests/types';
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

export async function createRequestAction(formData: FormData) {
  const customerName = requiredField(formData, 'customer_name');
  const phone = requiredField(formData, 'phone');
  const areaId = requiredField(formData, 'area_id');
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

  const [{ data: area, error: areaError }, { data: assignee, error: assigneeError }] = await Promise.all([
    supabase.from('areas').select('id,code,name').eq('id', areaId).single(),
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
    status: 'NEW',
    request_type: requestType
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function updateRequestStatusAction(formData: FormData) {
  const requestId = requiredField(formData, 'request_id');
  const nextStatus = requiredField(formData, 'status');

  if (!REQUEST_STATUSES.includes(nextStatus as (typeof REQUEST_STATUSES)[number])) {
    throw new Error('Invalid status');
  }

  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from('service_requests')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/dashboard');
  revalidatePath(`/requests/${requestId}`);
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

  revalidatePath('/dashboard');
  revalidatePath(`/requests/${requestId}`);
  redirect(`/requests/${requestId}`);
}
