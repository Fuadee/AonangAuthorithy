import Link from 'next/link';
import { DashboardSummary } from '@/components/dashboard-summary';
import { RequestTable } from '@/components/request-table';
import { ServiceRequest } from '@/lib/requests/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();

  const { data: requests, error } = await supabase
    .from('service_requests')
    .select(
      'id,request_no,customer_name,phone,area_name,assignee_name,status,created_at,updated_at'
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const typedRequests = (requests ?? []) as ServiceRequest[];
  const newCount = typedRequests.filter((request) => request.status === 'NEW').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Dashboard คำร้องผู้ใช้ไฟฟ้า</h2>
          <p className="mt-1 text-sm text-slate-500">ดูภาพรวมและรายการคำร้องทั้งหมด</p>
        </div>
        <Link className="btn-primary" href="/requests/new">
          สร้างคำร้องใหม่
        </Link>
      </div>

      <DashboardSummary totalCount={typedRequests.length} newCount={newCount} />
      <RequestTable requests={typedRequests} />
    </div>
  );
}
