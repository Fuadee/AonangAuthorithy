import { NextRequest, NextResponse } from 'next/server';
import { buildAnalyticsDebugSnapshot, ExecutiveTimeRange, EXECUTIVE_TIME_RANGES } from '@/lib/analytics/executive-dashboard';
import { ServiceRequest } from '@/lib/requests/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function parseTimeRange(value: string | null): ExecutiveTimeRange {
  if (!value) {
    return '30D';
  }

  return (EXECUTIVE_TIME_RANGES as readonly string[]).includes(value) ? (value as ExecutiveTimeRange) : '30D';
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'debug route is disabled in production' }, { status: 404 });
  }

  const timeRange = parseTimeRange(request.nextUrl.searchParams.get('range'));
  const latestRequestId = request.nextUrl.searchParams.get('latest_request_id') ?? undefined;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('service_requests')
    .select(
      'id,request_no,customer_name,phone,request_type,area_name,assignee_name,assigned_surveyor,scheduled_survey_date,survey_date_initial,survey_date_current,previous_survey_date,survey_rescheduled_at,survey_reschedule_reason,documents_received_at,awaiting_customer_documents_since,status,survey_note,survey_reschedule_date,survey_reviewed_at,survey_completed_at,survey_result,fix_verification_mode,customer_fix_note,customer_fix_reported_at,photo_review_status,photo_reviewed_at,photo_reviewed_by,fix_approved_via,document_status,collect_docs_on_site,incomplete_docs_note,reject_reason,rejected_by,rejected_at,billing_amount,billing_note,billed_at,billed_by,invoice_signed_at,invoice_signed_by,paid_at,paid_by,is_document_ready,document_prepared_at,planned_dispatch_date,dispatched_to_krabi_at,dispatched_to_krabi_by,krabi_received_at,krabi_in_progress_at,krabi_completed_at,latitude,longitude,location_note,created_at,updated_at'
    )
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const requests = (data ?? []) as ServiceRequest[];
  const snapshot = buildAnalyticsDebugSnapshot(requests, timeRange, new Date(), latestRequestId);

  return NextResponse.json(snapshot);
}
