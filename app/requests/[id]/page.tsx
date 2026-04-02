import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RequestAssigneeForm } from '@/components/request-assignee-form';
import { RequestStatusForm } from '@/components/request-status-form';
import { Assignee, REQUEST_TYPE_LABELS, RequestStatus, RequestType } from '@/lib/requests/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type RequestDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatSurveyDate(value: string | null): string {
  if (!value) {
    return '-';
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString('th-TH', { dateStyle: 'full' });
}

export default async function RequestDetailPage({ params }: RequestDetailPageProps) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const [{ data: request, error: requestError }, { data: assignees, error: assigneesError }] =
    await Promise.all([
      supabase
        .from('service_requests')
        .select(
          'id,request_no,customer_name,phone,request_type,area_name,assignee_id,assignee_name,assigned_surveyor,scheduled_survey_date,status,created_at,updated_at'
        )
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('assignees')
        .select('id,code,name,is_active')
        .eq('is_active', true)
        .order('code', { ascending: true })
    ]);

  if (requestError) {
    throw new Error(requestError.message);
  }

  if (assigneesError) {
    throw new Error(assigneesError.message);
  }

  if (!request) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">รายละเอียดคำร้อง</p>
          <h2 className="text-2xl font-semibold">{request.request_no}</h2>
        </div>
        <Link className="btn-secondary" href="/dashboard">
          กลับไป Dashboard
        </Link>
      </div>

      <section className="card p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">ชื่อลูกค้า</dt>
            <dd className="mt-1 font-medium">{request.customer_name}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">เบอร์โทรศัพท์</dt>
            <dd className="mt-1 font-medium">{request.phone}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">ประเภทคำร้อง</dt>
            <dd className="mt-1 font-medium">{REQUEST_TYPE_LABELS[request.request_type as RequestType]}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">พื้นที่</dt>
            <dd className="mt-1 font-medium">{request.area_name}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">ผู้รับผิดชอบ</dt>
            <dd className="mt-1 font-medium">{request.assignee_name}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">ผู้สำรวจ</dt>
            <dd className="mt-1 font-medium">{request.assigned_surveyor ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">วันสำรวจ</dt>
            <dd className="mt-1 font-medium">{formatSurveyDate(request.scheduled_survey_date)}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">สถานะ</dt>
            <dd className="mt-1 font-medium">{request.status}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">สร้างเมื่อ</dt>
            <dd className="mt-1 font-medium">{new Date(request.created_at).toLocaleString('th-TH')}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">อัปเดตล่าสุด</dt>
            <dd className="mt-1 font-medium">{new Date(request.updated_at).toLocaleString('th-TH')}</dd>
          </div>
        </dl>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="card p-6">
          <h3 className="text-lg font-semibold">เปลี่ยนสถานะ</h3>
          <p className="mt-1 text-sm text-slate-500">อัปเดตสถานะงานให้ตรงกับการดำเนินการล่าสุด</p>
          <div className="mt-4">
            <RequestStatusForm requestId={request.id} currentStatus={request.status as RequestStatus} />
          </div>
        </article>

        <article className="card p-6">
          <h3 className="text-lg font-semibold">เปลี่ยนผู้รับผิดชอบ</h3>
          <p className="mt-1 text-sm text-slate-500">เลือกเจ้าหน้าที่ที่รับผิดชอบคำร้องนี้</p>
          <div className="mt-4">
            <RequestAssigneeForm
              requestId={request.id}
              currentAssigneeId={request.assignee_id}
              assignees={(assignees ?? []) as Assignee[]}
            />
          </div>
        </article>
      </section>
    </div>
  );
}
