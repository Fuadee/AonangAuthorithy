import { createAdminClient } from "@/lib/supabase/admin";
import type { DashboardSummary } from "@/types/domain";

export type OverdueRequest = {
  request_id: string;
  request_no: string;
  current_status: string;
  updated_at: string;
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const supabase = createAdminClient();

  const [openRes, reviewRes, overdueRes, staleRes] = await Promise.all([
    supabase.from("service_requests").select("id", { count: "exact", head: true }).neq("current_status", "CLOSED"),
    supabase
      .from("service_requests")
      .select("id", { count: "exact", head: true })
      .eq("current_status", "WAITING_SURVEYOR_DOCUMENT_REVIEW"),
    supabase.from("v_sla_overdue_requests").select("request_id", { count: "exact", head: true }),
    supabase.from("v_stale_requests").select("id", { count: "exact", head: true })
  ]);

  const totalOpen = Number(openRes.count ?? 0);
  const waitingSurveyorReview = Number(reviewRes.count ?? 0);
  const slaOverdue = Number(overdueRes.count ?? 0);
  const staleJobs = Number(staleRes.count ?? 0);

  return { totalOpen, waitingSurveyorReview, slaOverdue, staleJobs };
}

export async function getAgingBuckets() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("v_request_aging").select("*");
  return data ?? [];
}

export async function getOverdueRequests(limit = 20): Promise<OverdueRequest[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("v_sla_overdue_requests")
    .select("request_id, request_no, current_status, updated_at")
    .order("updated_at", { ascending: true })
    .limit(limit);

  return (data ?? []).map((row) => ({
    request_id: String((row as Record<string, unknown>).request_id),
    request_no: String((row as Record<string, unknown>).request_no),
    current_status: String((row as Record<string, unknown>).current_status),
    updated_at: String((row as Record<string, unknown>).updated_at)
  }));
}
