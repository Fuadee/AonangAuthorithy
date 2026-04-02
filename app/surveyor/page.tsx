import { SurveyorRequestsPanel } from '@/components/surveyor-requests-panel';
import { ServiceRequest, SURVEYOR_VISIBLE_STATUSES } from '@/lib/requests/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type SurveyorPageProps = {
  searchParams?: Promise<{ surveyor?: string }>;
};

export default async function SurveyorPage({ searchParams }: SurveyorPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const selectedSurveyor = params?.surveyor?.trim() || null;

  const supabase = createServerSupabaseClient();

  const { data: requests, error } = await supabase
    .from('service_requests')
    .select(
      'id,request_no,customer_name,phone,request_type,area_name,assignee_name,assigned_surveyor,scheduled_survey_date,status,survey_note,survey_reschedule_date,survey_reviewed_at,survey_completed_at,created_at,updated_at'
    )
    .in('status', SURVEYOR_VISIBLE_STATUSES)
    .order('scheduled_survey_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const typedRequests = (requests ?? []) as ServiceRequest[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">คิวงานสำรวจ</h2>
        <p className="mt-1 text-sm text-slate-500">ติดตามภาพรวมงานของนักสำรวจทั้งหมด และกรองดูรายบุคคลได้ในหน้าเดียว</p>
      </div>

      <SurveyorRequestsPanel requests={typedRequests} defaultSurveyor={selectedSurveyor} />
    </div>
  );
}
