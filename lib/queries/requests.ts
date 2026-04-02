import { createAdminClient } from "@/lib/supabase/admin";

export type SurveyorOption = {
  id: string;
  full_name: string;
  area_code: string | null;
};

export type RequestDetail = {
  request: {
    id: string;
    request_no: string;
    request_type: string;
    current_status: string;
    area_code: string;
    customer_name: string;
    customer_phone: string;
    supply_address?: string | null;
    current_owner: { id: string; full_name: string } | null;
    created_at: string;
    updated_at: string;
  } | null;
  timeline: Array<{
    id: number;
    activity_type: string;
    payload: Record<string, unknown>;
    created_at: string;
    actor: { full_name: string } | null;
  }>;
  assignments: Array<Record<string, unknown>>;
  reviews: Array<Record<string, unknown>>;
};

export async function getSurveyorsByArea(areaCode?: string): Promise<SurveyorOption[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("profiles")
    .select("id, full_name, area_code, user_roles!inner(roles!inner(code))")
    .eq("user_roles.roles.code", "SURVEYOR")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (areaCode) {
    query = query.eq("area_code", areaCode);
  }

  const { data } = await query;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    full_name: row.full_name as string,
    area_code: (row.area_code as string | null) ?? null
  }));
}

export async function getRequestDetail(requestId: string): Promise<RequestDetail> {
  const supabase = createAdminClient();

  const [{ data: request }, { data: timeline }, { data: assignments }, { data: reviews }] = await Promise.all([
    supabase
      .from("service_requests")
      .select(
        `id, request_no, request_type, current_status, area_code, customer_name, customer_phone, supply_address,
        current_owner:profiles!service_requests_current_owner_id_fkey(id, full_name),
        created_at, updated_at`
      )
      .eq("id", requestId)
      .maybeSingle(),
    supabase
      .from("request_activities")
      .select("id, activity_type, payload, created_at, actor:profiles(full_name)")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("request_assignments")
      .select("id, assigned_at, reason, from_user:profiles!request_assignments_from_user_id_fkey(full_name), to_user:profiles!request_assignments_to_user_id_fkey(full_name), assigner:profiles!request_assignments_assigned_by_fkey(full_name)")
      .eq("request_id", requestId)
      .order("assigned_at", { ascending: false })
      .limit(20),
    supabase
      .from("document_review_checks")
      .select("id, review_result, missing_items, note, reviewed_at, reviewer:profiles(full_name)")
      .eq("request_id", requestId)
      .order("reviewed_at", { ascending: false })
      .limit(10)
  ]);

  const normalizedTimeline: RequestDetail["timeline"] = (timeline ?? []).map((row) => {
    const actorArray = ((row as Record<string, unknown>).actor as Array<{ full_name?: string }>) ?? [];
    const actor = actorArray[0]?.full_name ? { full_name: String(actorArray[0].full_name) } : null;

    return {
      id: Number((row as Record<string, unknown>).id),
      activity_type: String((row as Record<string, unknown>).activity_type),
      payload: ((row as Record<string, unknown>).payload as Record<string, unknown>) ?? {},
      created_at: String((row as Record<string, unknown>).created_at),
      actor
    };
  });

  return {
    request: request as RequestDetail["request"],
    timeline: normalizedTimeline,
    assignments: assignments ?? [],
    reviews: reviews ?? []
  };
}
