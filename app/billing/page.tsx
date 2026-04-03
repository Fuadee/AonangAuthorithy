import { BillingRequestsPanel } from '@/components/billing-requests-panel';
import { getStatusesByQueueGroup, ServiceRequest } from '@/lib/requests/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const supabase = createServerSupabaseClient();
  const billingQueueStatuses = getStatusesByQueueGroup('BILLING');

  const { data: requests, error } = await supabase
    .from('service_requests')
    .select(
      'id,request_no,customer_name,phone,request_type,area_name,assignee_name,assigned_surveyor,scheduled_survey_date,status,survey_note,survey_reschedule_date,survey_reviewed_at,survey_completed_at,document_status,collect_docs_on_site,incomplete_docs_note,billing_amount,billing_note,billed_at,billed_by,invoice_signed_at,invoice_signed_by,paid_at,paid_by,created_at,updated_at'
    )
    .in('status', billingQueueStatuses)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const typedRequests = (requests ?? []) as ServiceRequest[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">คิวการเงิน</h2>
        <p className="mt-1 text-sm text-slate-500">แสดงงานที่รอออกใบแจ้งหนี้และงานรอดำเนินการหลังแจ้งหนี้สำหรับทีมการเงิน</p>
      </div>

      <BillingRequestsPanel requests={typedRequests} />
    </div>
  );
}
