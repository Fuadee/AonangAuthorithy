import { createAdminClient } from "@/lib/supabase/admin";
import type { DashboardSummary } from "@/types/domain";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const supabase = createAdminClient();

  const [{ count: totalOpen = 0 }, { count: waitingSurveyorReview = 0 }, { count: slaOverdue = 0 }, { count: staleJobs = 0 }] =
    await Promise.all([
      supabase.from("service_requests").select("id", { count: "exact", head: true }).neq("current_status", "CLOSED"),
      supabase
        .from("service_requests")
        .select("id", { count: "exact", head: true })
        .eq("current_status", "WAITING_SURVEYOR_DOCUMENT_REVIEW"),
      supabase.from("v_sla_overdue_requests").select("request_id", { count: "exact", head: true }),
      supabase.from("v_stale_requests").select("id", { count: "exact", head: true })
    ]);

  return { totalOpen, waitingSurveyorReview, slaOverdue, staleJobs };
}

export async function getAgingBuckets() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("v_request_aging").select("*");
  return data ?? [];
}

export async function getOverdueRequests(limit = 20) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("v_sla_overdue_requests")
    .select("request_id, request_no, current_status, updated_at")
    .order("updated_at", { ascending: true })
    .limit(limit);

  return data ?? [];
}
