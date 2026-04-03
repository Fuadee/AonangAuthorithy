import { SurveyorRequestsPanel } from '@/components/surveyor-requests-panel';
import { getStatusesByQueueGroup, ServiceRequest } from '@/lib/requests/types';
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
      'id,request_no,customer_name,phone,request_type,area_name,assignee_name,assigned_surveyor,scheduled_survey_date,survey_date_initial,survey_date_current,previous_survey_date,survey_rescheduled_at,survey_reschedule_reason,documents_received_at,awaiting_customer_documents_since,status,survey_note,survey_reschedule_date,survey_reviewed_at,survey_completed_at,document_status,collect_docs_on_site,incomplete_docs_note,billing_amount,billing_note,billed_at,billed_by,invoice_signed_at,invoice_signed_by,paid_at,paid_by,created_at,updated_at'
    )
    .in('status', surveyQueueStatuses)
    .order('scheduled_survey_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const typedRequests = (requests ?? []) as ServiceRequest[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">คิวนักสำรวจ</h2>
        <p className="mt-1 text-sm text-slate-500">แสดงเฉพาะงานที่อยู่ในคิวนักสำรวจ และกรองดูรายบุคคลได้ในหน้าเดียว</p>
      </div>

      <SurveyorRequestsPanel requests={typedRequests} defaultSurveyor={selectedSurveyor} />
    </div>
  );
}
