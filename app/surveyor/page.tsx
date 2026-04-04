import Link from 'next/link';
import { Map } from 'lucide-react';
import { SurveyorRequestsPanel } from '@/components/surveyor-requests-panel';
import { getStatusesByQueueGroup, REQUEST_QUEUE_GROUP_META, ServiceRequest } from '@/lib/requests/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type SurveyorPageProps = {
  searchParams?: Promise<{ surveyor?: string }>;
};

export default async function SurveyorPage({ searchParams }: SurveyorPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const selectedSurveyor = params?.surveyor?.trim() || null;

  const supabase = createServerSupabaseClient();
  const surveyQueueStatuses = getStatusesByQueueGroup('SURVEY');

  const { data: requests, error } = await supabase
    .from('service_requests')
    .select(
      'id,request_no,customer_name,phone,request_type,area_name,assignee_name,assigned_surveyor,scheduled_survey_date,survey_date_initial,survey_date_current,previous_survey_date,survey_rescheduled_at,survey_reschedule_reason,documents_received_at,awaiting_customer_documents_since,status,survey_note,survey_reschedule_date,survey_reviewed_at,survey_completed_at,survey_result,fix_verification_mode,customer_fix_note,customer_fix_reported_at,photo_review_status,photo_reviewed_at,photo_reviewed_by,fix_approved_via,document_status,collect_docs_on_site,incomplete_docs_note,billing_amount,billing_note,billed_at,billed_by,invoice_signed_at,invoice_signed_by,paid_at,paid_by,ready_to_send_krabi_at,queued_for_dispatch_at,planned_dispatch_date,dispatched_to_krabi_at,dispatched_to_krabi_by,krabi_received_at,krabi_in_progress_at,krabi_completed_at,latitude,longitude,location_note,created_at,updated_at'
    )
    .in('status', surveyQueueStatuses)
    .order('scheduled_survey_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const typedRequests = (requests ?? []) as ServiceRequest[];
  const filteredRequestCount = selectedSurveyor
    ? typedRequests.filter((request) => request.assigned_surveyor === selectedSurveyor).length
    : typedRequests.length;

  const mapParams = new URLSearchParams({
    status: surveyQueueStatuses.join(',')
  });
  if (selectedSurveyor) {
    mapParams.set('surveyor', selectedSurveyor);
  }
  const mapHref = `/survey/map?${mapParams.toString()}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{REQUEST_QUEUE_GROUP_META.SURVEY.label}</h2>
          <p className="mt-1 text-sm text-slate-500">แสดงเฉพาะงานสำรวจ และกรองดูรายบุคคลได้ในหน้าเดียว</p>
        </div>
        <Link
          className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-5 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-[#1D4ED8]"
          href={mapHref}
        >
          <Map className="h-4 w-4" />
          ดูงานในแผนที่ ({filteredRequestCount})
        </Link>
      </div>

      <SurveyorRequestsPanel requests={typedRequests} defaultSurveyor={selectedSurveyor} />
    </div>
  );
}
