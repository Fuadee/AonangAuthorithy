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
      'id,request_no,customer_name,phone,request_type,request_intent,meter_size,phase,flow_type,area_name,assignee_name,assigned_surveyor_id,assigned_surveyor,scheduled_survey_date,survey_date_initial,survey_date_current,previous_survey_date,survey_rescheduled_at,survey_reschedule_reason,documents_received_at,awaiting_customer_documents_since,status,survey_note,survey_reschedule_date,survey_reviewed_at,survey_completed_at,survey_result,fix_verification_mode,customer_fix_note,customer_fix_reported_at,photo_review_status,photo_reviewed_at,photo_reviewed_by,fix_approved_via,document_status,collect_docs_on_site,incomplete_docs_note,is_document_ready,document_prepared_at,planned_dispatch_date,dispatched_to_krabi_at,dispatched_to_krabi_by,krabi_received_at,krabi_in_progress_at,krabi_completed_at,three_phase_capability_result,three_phase_capability_checked_at,house_number,village_no,road,landmark,latitude,longitude,location_note,created_at,updated_at'
    )
    .in('status', surveyQueueStatuses)
    .order('scheduled_survey_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[surveyor/page] failed to load survey queue', {
      message: error.message,
      selectedSurveyor,
      statuses: surveyQueueStatuses
    });
  }

  const typedRequests = ((error ? [] : requests) ?? []) as ServiceRequest[];
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
          className="btn-primary gap-2 px-5"
          href={mapHref}
        >
          <Map className="h-4 w-4" />
          ดูงานในแผนที่
        </Link>
      </div>

      <SurveyorRequestsPanel requests={typedRequests} defaultSurveyor={selectedSurveyor} />
      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          ไม่สามารถโหลดคิวสำรวจล่าสุดได้ชั่วคราว กรุณารีเฟรชหน้าอีกครั้ง
        </p>
      ) : null}
    </div>
  );
}
