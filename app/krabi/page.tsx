import { RequestTable } from '@/components/request-table';
import { getStatusesByQueueGroup, ServiceRequest } from '@/lib/requests/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function KrabiQueuePage() {
  const supabase = createServerSupabaseClient();
  const krabiQueueStatuses = getStatusesByQueueGroup('KRABI');

  const { data: requests, error } = await supabase
    .from('service_requests')
    .select(
      'id,request_no,customer_name,phone,request_type,area_name,assignee_name,assigned_surveyor,scheduled_survey_date,survey_date_initial,survey_date_current,previous_survey_date,survey_rescheduled_at,survey_reschedule_reason,documents_received_at,awaiting_customer_documents_since,status,survey_note,survey_reschedule_date,survey_reviewed_at,survey_completed_at,survey_result,fix_verification_mode,customer_fix_note,customer_fix_reported_at,photo_review_status,photo_reviewed_at,photo_reviewed_by,fix_approved_via,document_status,collect_docs_on_site,incomplete_docs_note,billing_amount,billing_note,billed_at,billed_by,invoice_signed_at,invoice_signed_by,paid_at,paid_by,ready_to_send_krabi_at,queued_for_dispatch_at,planned_dispatch_date,dispatched_to_krabi_at,dispatched_to_krabi_by,krabi_received_at,krabi_in_progress_at,krabi_completed_at,latitude,longitude,location_note,created_at,updated_at'
    )
    .in('status', krabiQueueStatuses)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const typedRequests = (requests ?? []) as ServiceRequest[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">คิวกระบี่</h2>
        <p className="mt-1 text-sm text-slate-500">แสดงงานที่ส่งไปกระบี่แล้ว งานที่กำลังดำเนินการ งานประมาณการเสร็จ และงานออกใบแจ้งหนี้แล้ว</p>
      </div>

      <RequestTable requests={typedRequests} />
    </div>
  );
}
