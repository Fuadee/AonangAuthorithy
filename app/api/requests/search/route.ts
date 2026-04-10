import { NextResponse } from 'next/server';
import { RequestIntent, isRequestIntent } from '@/lib/requests/request-intent';
import { getPrimaryRequestType } from '@/lib/requests/request-display';
import { getRequestQueueGroup, isOverloadCompletedAwaitingKrabi, RequestQueueGroup, RequestStatus } from '@/lib/requests/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const BASE_SELECT =
  'id,request_no,customer_name,phone,request_type,request_intent,meter_size,phase,flow_type,three_phase_capability_result,area_name,assignee_name,assigned_surveyor_id,assigned_surveyor,scheduled_survey_date,survey_date_initial,survey_date_current,previous_survey_date,survey_rescheduled_at,survey_reschedule_reason,documents_received_at,awaiting_customer_documents_since,status,survey_note,survey_reschedule_date,survey_reviewed_at,survey_completed_at,survey_result,survey_failure_type,fix_verification_mode,customer_fix_note,customer_fix_reported_at,photo_review_status,photo_reviewed_at,photo_reviewed_by,fix_approved_via,document_status,collect_docs_on_site,incomplete_docs_note,billing_amount,billing_note,billed_at,billed_by,invoice_signed_at,invoice_signed_by,paid_at,paid_by,is_document_ready,document_prepared_at,planned_dispatch_date,dispatched_to_krabi_at,dispatched_to_krabi_by,krabi_received_at,krabi_in_progress_at,krabi_completed_at,house_number,village_no,road,landmark,latitude,longitude,location_note,created_at,updated_at';

function escapeLike(value: string): string {
  return value.replace(/[%_]/g, '\\$&');
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() ?? '';
  const queue = url.searchParams.get('queue')?.trim();
  const primaryTypeRaw = url.searchParams.get('primary_type')?.trim();
  const primaryType: RequestIntent | null = primaryTypeRaw && isRequestIntent(primaryTypeRaw) ? primaryTypeRaw : null;
  const limit = Number(url.searchParams.get('limit') ?? '20');
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 50) : 20;

  const supabase = createServerSupabaseClient();
  let dbQuery = supabase.from('service_requests').select(BASE_SELECT).order('created_at', { ascending: false }).limit(safeLimit);

  if (query) {
    const escaped = escapeLike(query);
    const pattern = `%${escaped}%`;
    dbQuery = dbQuery.or(
      [
        `search_text.ilike.${pattern}`,
        `customer_name.ilike.${pattern}`,
        `phone.ilike.${pattern}`,
        `house_number.ilike.${pattern}`,
        `village_no.ilike.${pattern}`,
        `road.ilike.${pattern}`,
        `landmark.ilike.${pattern}`,
        `area_name.ilike.${pattern}`,
        `request_no.ilike.${pattern}`
      ].join(',')
    );
  }

  const { data, error } = await dbQuery;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let filtered = data ?? [];
  if (primaryType) {
    filtered = filtered.filter((item) => getPrimaryRequestType(item) === primaryType);
  }
  if (queue && queue !== 'ALL') {
    if (queue === 'WAITING_KRABI') {
      filtered = filtered.filter((item) =>
        isOverloadCompletedAwaitingKrabi({
          status: item.status as RequestStatus,
          survey_failure_type: item.survey_failure_type
        })
      );
    } else {
      filtered = filtered.filter(
        (item) =>
          !isOverloadCompletedAwaitingKrabi({
            status: item.status as RequestStatus,
            survey_failure_type: item.survey_failure_type
          }) && getRequestQueueGroup(item.status as RequestStatus) === (queue as RequestQueueGroup)
      );
    }
  }

  return NextResponse.json({ data: filtered });
}
