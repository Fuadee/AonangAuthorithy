import { RequestTable } from '@/components/request-table';
import Link from 'next/link';
import { getRequestStatusLabel, getStatusesByQueueGroup, REQUEST_QUEUE_GROUP_META, RequestStatus, ServiceRequest } from '@/lib/requests/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type DocumentQueuePageProps = {
  searchParams?: Promise<{ status?: string }>;
};

export default async function DocumentQueuePage({ searchParams }: DocumentQueuePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const supabase = createServerSupabaseClient();
  const documentQueueStatuses = getStatusesByQueueGroup('DISPATCH');
  const selectedStatus = params?.status && documentQueueStatuses.includes(params.status as RequestStatus) ? (params.status as RequestStatus) : 'ALL';

  const { data: requests, error } = await supabase
    .from('service_requests')
    .select(
      'id,request_no,customer_name,phone,request_type,area_name,assignee_name,assigned_surveyor,scheduled_survey_date,survey_date_initial,survey_date_current,previous_survey_date,survey_rescheduled_at,survey_reschedule_reason,documents_received_at,awaiting_customer_documents_since,status,survey_note,survey_reschedule_date,survey_reviewed_at,survey_completed_at,survey_result,fix_verification_mode,customer_fix_note,customer_fix_reported_at,photo_review_status,photo_reviewed_at,photo_reviewed_by,fix_approved_via,document_status,collect_docs_on_site,incomplete_docs_note,billing_amount,billing_note,billed_at,billed_by,invoice_signed_at,invoice_signed_by,paid_at,paid_by,is_document_ready,document_prepared_at,planned_dispatch_date,dispatched_to_krabi_at,dispatched_to_krabi_by,krabi_received_at,krabi_in_progress_at,krabi_completed_at,latitude,longitude,location_note,created_at,updated_at'
    )
    .in('status', documentQueueStatuses)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const typedRequests = (requests ?? []) as ServiceRequest[];
  const filteredRequests = selectedStatus === 'ALL' ? typedRequests : typedRequests.filter((request) => request.status === selectedStatus);
  const statusCounts = documentQueueStatuses.map((status) => ({
    status,
    label: getRequestStatusLabel(status),
    count: typedRequests.filter((request) => request.status === status).length
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{REQUEST_QUEUE_GROUP_META.DISPATCH.label}</h2>
        <p className="mt-1 text-sm text-slate-500">แสดงงานย่อยในงานเอกสาร พร้อมกรองตามสถานะย่อยได้</p>
      </div>

      <section className="card p-4">
        <div className="flex flex-wrap gap-2">
          <Link
            className={`inline-flex max-w-full items-center rounded-full border px-3 py-1.5 text-sm whitespace-nowrap ${
              selectedStatus === 'ALL' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 bg-white text-slate-600'
            }`}
            href="/document"
          >
            ทั้งหมด ({typedRequests.length})
          </Link>
          {statusCounts.map((item) => (
            <Link
              key={item.status}
              className={`inline-flex max-w-full items-center rounded-full border px-3 py-1.5 text-sm whitespace-nowrap ${
                selectedStatus === item.status ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 bg-white text-slate-600'
              }`}
              href={`/document?status=${item.status}`}
              title={`${item.label} (${item.count})`}
            >
              <span className="truncate">{item.label} ({item.count})</span>
            </Link>
          ))}
        </div>
      </section>

      <RequestTable actionColumnLabel="จัดการ" actionColumnMode="workflow" presentation="grid" requests={filteredRequests} />
    </div>
  );
}
