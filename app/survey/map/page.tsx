import { SurveyMapQueuePage } from '@/components/survey-map/SurveyMapQueuePage';
import type { SurveyQueueRequest } from '@/components/survey-map/types';
import { getCurrentSurveyDate, getSurveyMapStatusesFromQuery, RequestStatus, ServiceRequest } from '@/lib/requests/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type SurveyMapPageProps = {
  searchParams?: Promise<{ status?: string; area?: string; assignee?: string; surveyor?: string }>;
};

export default async function SurveyMapPage({ searchParams }: SurveyMapPageProps) {
  const params = searchParams ? await searchParams : undefined;
  // Map shows only active field survey jobs (IN_PROGRESS)
  const statuses = getSurveyMapStatusesFromQuery(params?.status);

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('service_requests')
    .select(
      'id,request_no,customer_name,phone,request_type,area_name,assignee_name,assigned_surveyor,scheduled_survey_date,survey_date_initial,survey_date_current,status,latitude,longitude,created_at'
    )
    .in('status', statuses)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const mappedRequests: SurveyQueueRequest[] = ((data ?? []) as Array<
    Pick<
      ServiceRequest,
      | 'id'
      | 'request_no'
      | 'customer_name'
      | 'phone'
      | 'request_type'
      | 'area_name'
      | 'assignee_name'
      | 'assigned_surveyor'
      | 'scheduled_survey_date'
      | 'survey_date_initial'
      | 'survey_date_current'
      | 'status'
      | 'latitude'
      | 'longitude'
      | 'created_at'
    >
  >).map((request) => ({
    id: request.id,
    request_no: request.request_no,
    customer_name: request.customer_name,
    phone: request.phone,
    request_type: request.request_type,
    area_name: request.area_name,
    assignee_name: request.assignee_name,
    assigned_surveyor: request.assigned_surveyor,
    latest_survey_date: getCurrentSurveyDate(request),
    status: request.status as RequestStatus,
    latitude: request.latitude,
    longitude: request.longitude,
    created_at: request.created_at
  }));

  return <SurveyMapQueuePage requests={mappedRequests} activeStatuses={statuses} initialSurveyor={params?.surveyor} />;
}
