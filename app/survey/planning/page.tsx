import { SurveyPlanningBoard } from '@/components/survey-planning-board';
import { SURVEY_PLANNING_ACTIVE_STATUSES, SurveyPlanningRequest } from '@/lib/requests/survey-planning';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function SurveyPlanningPage() {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('service_requests')
    .select(
      'id,request_no,customer_name,request_type,status,assigned_surveyor,assignee_name,scheduled_survey_date,survey_date_current,survey_date_initial,previous_survey_date,survey_rescheduled_at'
    )
    .in('status', SURVEY_PLANNING_ACTIVE_STATUSES)
    .not('scheduled_survey_date', 'is', null)
    .order('scheduled_survey_date', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const requests = (data ?? []) as SurveyPlanningRequest[];

  return <SurveyPlanningBoard requests={requests} />;
}
