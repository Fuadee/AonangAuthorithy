import { createAdminClient } from "@/lib/supabase/admin";
import { ALLOWED_TRANSITIONS } from "@/lib/workflow/constants";
import type { RequestStatus } from "@/types/domain";

export async function transitionStatus(params: {
  requestId: string;
  fromStatus: RequestStatus;
  toStatus: RequestStatus;
  actorId: string;
  note?: string;
}) {
  const { requestId, fromStatus, toStatus, actorId, note } = params;

  if (!ALLOWED_TRANSITIONS[fromStatus]?.includes(toStatus)) {
    throw new Error(`Invalid transition ${fromStatus} -> ${toStatus}`);
  }

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("transition_service_request", {
    p_request_id: requestId,
    p_from_status: fromStatus,
    p_to_status: toStatus,
    p_actor_id: actorId,
    p_note: note ?? null
  });

  if (error) throw error;
}
