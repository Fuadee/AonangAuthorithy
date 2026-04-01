"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/guards/auth";
import { transitionStatus } from "@/lib/workflow/service";
import { assignRequestSchema, createRequestSchema, reviewDocumentSchema } from "@/lib/workflow/validators";

export async function createRequestAction(formData: FormData) {
  const { user } = await requirePermission("request.create");

  const parsed = createRequestSchema.parse({
    requestType: formData.get("requestType"),
    areaCode: formData.get("areaCode"),
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    supplyAddress: formData.get("supplyAddress")
  });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("service_requests")
    .insert({
      request_type: parsed.requestType,
      area_code: parsed.areaCode,
      customer_name: parsed.customerName,
      customer_phone: parsed.customerPhone,
      supply_address: parsed.supplyAddress,
      current_status: "WAITING_SURVEY_ASSIGNMENT",
      created_by: user.id,
      current_owner_id: user.id,
      prelim_check_ok: true
    })
    .select("id")
    .single();

  if (error) throw error;

  await supabase.from("request_activities").insert({
    request_id: data.id,
    actor_id: user.id,
    activity_type: "REQUEST_CREATED",
    payload: parsed
  });

  await supabase.from("request_status_history").insert({
    request_id: data.id,
    from_status: "NEW",
    to_status: "WAITING_SURVEY_ASSIGNMENT",
    changed_by: user.id,
    note: "Preliminary check completed"
  });

  revalidatePath("/dashboard");
  revalidatePath(`/requests/${data.id}`);
  return data.id;
}

export async function assignSurveyorAction(formData: FormData) {
  const { user } = await requirePermission("request.assign");

  const parsed = assignRequestSchema.parse({
    requestId: formData.get("requestId"),
    assigneeId: formData.get("assigneeId"),
    note: formData.get("note")
  });

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("assign_request_owner", {
    p_request_id: parsed.requestId,
    p_assignee_id: parsed.assigneeId,
    p_actor_id: user.id,
    p_note: parsed.note ?? null
  });
  if (error) throw error;

  await transitionStatus({
    requestId: parsed.requestId,
    fromStatus: "WAITING_SURVEY_ASSIGNMENT",
    toStatus: "WAITING_SURVEYOR_DOCUMENT_REVIEW",
    actorId: user.id,
    note: "Assigned to surveyor"
  });

  revalidatePath(`/requests/${parsed.requestId}`);
}

export async function reviewDocumentAction(formData: FormData) {
  const { user } = await requirePermission("request.document_review");

  const decision = String(formData.get("decision"));
  const missingItemsInput = String(formData.get("missingItems") ?? "");

  const parsed = reviewDocumentSchema.parse({
    requestId: formData.get("requestId"),
    decision,
    missingItems: missingItemsInput
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
    note: formData.get("note")
  });

  const supabase = createAdminClient();

  const decisionMap = {
    READY: "DOCUMENT_READY_FOR_SURVEY",
    INCOMPLETE: "DOCUMENT_INCOMPLETE",
    NEED_INFO: "NEED_MORE_INFO"
  } as const;

  await supabase.from("document_review_checks").insert({
    request_id: parsed.requestId,
    reviewer_id: user.id,
    review_result: parsed.decision,
    missing_items: parsed.missingItems,
    note: parsed.note ?? null
  });

  await transitionStatus({
    requestId: parsed.requestId,
    fromStatus: "WAITING_SURVEYOR_DOCUMENT_REVIEW",
    toStatus: decisionMap[parsed.decision],
    actorId: user.id,
    note: parsed.note
  });

  revalidatePath(`/requests/${parsed.requestId}`);
}
