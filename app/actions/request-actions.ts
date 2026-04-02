"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { PermissionDeniedError, requirePermission } from "@/lib/guards/auth";
import { transitionStatus } from "@/lib/workflow/service";
import { assignRequestSchema, createRequestSchema, reviewDocumentSchema } from "@/lib/workflow/validators";
import type { CreateRequestActionState } from "@/app/actions/request-action-state";


export async function createRequestAction(
  _prevState: CreateRequestActionState,
  formData: FormData
): Promise<CreateRequestActionState> {
  console.info("[request.create] start");

  try {
    const { user, roles, permissions } = await requirePermission("request.create", { redirectTo: null });

    console.info("[request.create] user resolved", {
      userId: user.id,
      roles,
      permissions
    });

    const parsed = createRequestSchema.parse({
      requestType: formData.get("requestType"),
      areaCode: formData.get("areaCode"),
      customerName: formData.get("customerName"),
      customerPhone: formData.get("customerPhone")
    });

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("service_requests")
      .insert({
        request_type: parsed.requestType,
        area_code: parsed.areaCode,
        customer_name: parsed.customerName,
        customer_phone: parsed.customerPhone,
        current_status: "WAITING_SURVEY_ASSIGNMENT",
        created_by: user.id,
        current_owner_id: user.id,
        prelim_check_ok: true
      })
      .select("id")
      .single();

    if (error) {
      console.error("[request.create] insert service_requests failed", { userId: user.id, error: error.message });
      return { error: "ไม่สามารถบันทึกคำร้องได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง" };
    }

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

    const destination = `/requests/${data.id}`;
    console.info("[request.create] success", {
      userId: user.id,
      requestId: data.id,
      destination
    });

    redirect(destination);
  } catch (error) {
    if (error instanceof PermissionDeniedError) {
      console.error("[request.create] permission denied", {
        userId: error.userId,
        permission: error.permission
      });
      return { error: "คุณไม่มีสิทธิ์สร้างคำร้อง กรุณาติดต่อผู้ดูแลระบบ" };
    }

    if (error instanceof ZodError) {
      console.error("[request.create] validation failed", {
        issues: error.issues.map((issue) => issue.message)
      });
      return { error: "ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" };
    }

    console.error("[request.create] unexpected error", error);
    return { error: "เกิดข้อผิดพลาดไม่คาดคิด กรุณาลองใหม่อีกครั้ง" };
  }
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
