import Link from 'next/link';
import { DashboardRequestsPanel } from '@/components/dashboard-requests-panel';
import { ServiceRequest } from '@/lib/requests/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type DashboardPageProps = {
  searchParams?: Promise<{ queue?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const defaultQueue = params?.queue ?? null;
  const supabase = createServerSupabaseClient();

  const { data: requests, error } = await supabase
    .from('service_requests')
    .select(
      'id,request_no,customer_name,phone,request_type,area_name,assignee_name,assigned_surveyor,scheduled_survey_date,survey_date_initial,survey_date_current,previous_survey_date,survey_rescheduled_at,survey_reschedule_reason,documents_received_at,awaiting_customer_documents_since,status,survey_note,survey_reschedule_date,survey_reviewed_at,survey_completed_at,survey_result,fix_verification_mode,customer_fix_note,customer_fix_reported_at,photo_review_status,photo_reviewed_at,photo_reviewed_by,fix_approved_via,document_status,collect_docs_on_site,incomplete_docs_note,billing_amount,billing_note,billed_at,billed_by,invoice_signed_at,invoice_signed_by,paid_at,paid_by,is_document_ready,document_prepared_at,planned_dispatch_date,dispatched_to_krabi_at,dispatched_to_krabi_by,krabi_received_at,krabi_in_progress_at,krabi_completed_at,latitude,longitude,location_note,created_at,updated_at'
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const typedRequests = (requests ?? []) as ServiceRequest[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#0F172A]">Dashboard คำร้องผู้ใช้ไฟฟ้า</h2>
          <p className="mt-1 text-sm text-[#64748B]">ดูภาพรวมและจัดการงานคำร้องแบบรวดเร็ว</p>
        </div>
        <div className="flex items-center gap-2">
          <Link className="btn-primary" href="/survey/planning">
            ดูแผนสำรวจ
          </Link>
        </div>
      </div>

      <DashboardRequestsPanel requests={typedRequests} defaultQueue={defaultQueue} />
    </div>
  );
}
