import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RequestAssigneeForm } from '@/components/request-assignee-form';
import { RequestStatusForm } from '@/components/request-status-form';
import { SurveyorActionForm } from '@/components/surveyor-action-form';
import {
  Assignee,
  getRequestStatusLabel,
  REQUEST_TYPE_LABELS,
  RequestStatus,
  RequestType,
  SURVEYOR_VISIBLE_STATUSES
} from '@/lib/requests/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type RequestDetailPageProps = {
  params: Promise<{ id: string }>;
};

type TimelineItem = {
  key: string;
  title: string;
  description?: string;
  at: string;
};

function formatSurveyDate(value: string | null): string {
  if (!value) {
    return '-';
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString('th-TH', { dateStyle: 'full' });
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('th-TH');
}

function getNextStepSummary(status: RequestStatus): { nextStep: string; owner: string } {
  switch (status) {
    case 'PENDING_SURVEY_REVIEW':
      return {
        nextStep: 'นักสำรวจตรวจเอกสารและเลือกการดำเนินการ',
        owner: 'นักสำรวจ'
      };
    case 'SURVEY_ACCEPTED':
      return {
        nextStep: 'ลงพื้นที่สำรวจตามวันนัดหมาย หรือขอเลื่อนวันสำรวจ',
        owner: 'นักสำรวจ'
      };
    case 'SURVEY_DOCS_INCOMPLETE':
      return {
        nextStep: 'คนรับคำร้องติดตามเอกสารเพิ่มเติมจากลูกค้า',
        owner: 'เจ้าหน้าที่รับคำร้อง'
      };
    case 'SURVEY_RESCHEDULE_REQUESTED':
      return {
        nextStep: 'ยืนยันวันสำรวจใหม่และติดตามความพร้อมของลูกค้า',
        owner: 'เจ้าหน้าที่รับคำร้อง'
      };
    case 'SURVEY_COMPLETED':
      return {
        nextStep: 'สำรวจหน้างานเสร็จสิ้นแล้ว',
        owner: 'ทีมรับคำร้องดำเนินการขั้นตอนถัดไป'
      };
    default:
      return {
        nextStep: 'รอตรวจสอบคำร้องและมอบหมายงาน',
        owner: 'เจ้าหน้าที่รับคำร้อง'
      };
  }
}

function getSurveyorStatusMessage(status: RequestStatus): string {
  switch (status) {
    case 'SURVEY_DOCS_INCOMPLETE':
      return 'รอคนรับคำร้องติดตามเอกสารเพิ่มเติม';
    case 'SURVEY_COMPLETED':
      return 'สำรวจหน้างานเสร็จสิ้นแล้ว';
    case 'SURVEY_RESCHEDULE_REQUESTED':
      return 'นักสำรวจขอเลื่อนวันสำรวจ รอยืนยันวันนัดใหม่';
    default:
      return 'เลือกการดำเนินการที่ตรงกับงานจริง โดยระบบจะอัปเดตสถานะให้อัตโนมัติ';
  }
}

function getTimeline(request: {
  created_at: string;
  survey_reviewed_at: string | null;
  survey_reschedule_date: string | null;
  survey_completed_at: string | null;
  updated_at: string;
  status: RequestStatus;
  survey_note: string | null;
}): TimelineItem[] {
  const items: TimelineItem[] = [
    {
      key: 'created',
      title: 'สร้างคำร้อง',
      at: request.created_at
    }
  ];

  if (request.survey_reviewed_at) {
    items.push({
      key: 'reviewed',
      title: 'ตรวจเอกสารล่าสุด',
      description: request.survey_note ? `หมายเหตุ: ${request.survey_note}` : undefined,
      at: request.survey_reviewed_at
    });
  }

  if (request.survey_reschedule_date) {
    items.push({
      key: 'rescheduled',
      title: 'ขอเลื่อนวันสำรวจ',
      description: `วันสำรวจใหม่: ${formatSurveyDate(request.survey_reschedule_date)}`,
      at: `${request.survey_reschedule_date}T00:00:00`
    });
  }

  if (request.survey_completed_at) {
    items.push({
      key: 'completed',
      title: 'สำรวจหน้างานเสร็จ',
      at: request.survey_completed_at
    });
  }

  if (request.updated_at !== request.created_at) {
    items.push({
      key: 'updated',
      title: 'อัปเดตข้อมูลล่าสุด',
      description: `สถานะล่าสุด: ${getRequestStatusLabel(request.status)}`,
      at: request.updated_at
    });
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export default async function RequestDetailPage({ params }: RequestDetailPageProps) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const [{ data: request, error: requestError }, { data: assignees, error: assigneesError }] =
    await Promise.all([
      supabase
        .from('service_requests')
        .select(
          'id,request_no,customer_name,phone,request_type,area_name,assignee_id,assignee_name,assigned_surveyor,scheduled_survey_date,status,survey_note,survey_reschedule_date,survey_reviewed_at,survey_completed_at,created_at,updated_at'
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

  const requestStatus = request.status as RequestStatus;
  const isSurveyorFlowStatus = SURVEYOR_VISIBLE_STATUSES.includes(requestStatus);
  const nextStepSummary = getNextStepSummary(requestStatus);
  const timeline = getTimeline({
    created_at: request.created_at,
    survey_reviewed_at: request.survey_reviewed_at,
    survey_reschedule_date: request.survey_reschedule_date,
    survey_completed_at: request.survey_completed_at,
    updated_at: request.updated_at,
    status: requestStatus,
    survey_note: request.survey_note
  });

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
        <h3 className="text-lg font-semibold">สรุปสถานะงานล่าสุด</h3>
        <p className="mt-1 text-sm text-slate-500">สรุปให้เห็นทันทีว่างานอยู่ขั้นไหนและใครต้องทำต่อ</p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-sm text-slate-500">สถานะปัจจุบัน</dt>
            <dd className="mt-1 font-medium">{getRequestStatusLabel(requestStatus)}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">ผู้สำรวจ</dt>
            <dd className="mt-1 font-medium">{request.assigned_surveyor ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">วันสำรวจนัดหมาย</dt>
            <dd className="mt-1 font-medium">{formatSurveyDate(request.scheduled_survey_date)}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">ผลการตรวจเอกสารล่าสุด</dt>
            <dd className={`mt-1 font-medium ${requestStatus === 'SURVEY_DOCS_INCOMPLETE' ? 'text-amber-700' : ''}`}>
              {request.survey_note ?? 'ยังไม่มีหมายเหตุ'}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">ขั้นตอนถัดไป</dt>
            <dd className="mt-1 font-medium">{nextStepSummary.nextStep}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">ผู้ดำเนินการต่อ</dt>
            <dd className="mt-1 font-medium">{nextStepSummary.owner}</dd>
          </div>
        </dl>
      </section>

      <section className="card p-6">
        <h3 className="text-lg font-semibold">ประวัติการดำเนินงาน</h3>
        <p className="mt-1 text-sm text-slate-500">เรียงตามลำดับเวลาเพื่อให้ติดตามงานได้ง่าย</p>
        <ol className="mt-4 space-y-3">
          {timeline.map((item) => (
            <li className="rounded-lg border border-slate-200 p-3" key={item.key}>
              <p className="text-sm font-semibold text-slate-800">{item.title}</p>
              {item.description ? <p className="mt-1 text-sm text-slate-600">{item.description}</p> : null}
              <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.at)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="card p-6">
          <h3 className="text-lg font-semibold">ข้อมูลคำร้อง</h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">เลขคำร้อง</dt>
              <dd className="mt-1 font-medium">{request.request_no}</dd>
            </div>
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
              <dt className="text-sm text-slate-500">เจ้าหน้าที่รับคำร้อง</dt>
              <dd className="mt-1 font-medium">{request.assignee_name}</dd>
            </div>
          </dl>
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

      <article className="card p-6">
        <h3 className="text-lg font-semibold">Action ฝั่งนักสำรวจ</h3>
        <p className="mt-1 text-sm text-slate-500">{getSurveyorStatusMessage(requestStatus)}</p>
        <div className="mt-4">
          {isSurveyorFlowStatus && !['SURVEY_DOCS_INCOMPLETE', 'SURVEY_COMPLETED'].includes(requestStatus) ? (
            <SurveyorActionForm requestId={request.id} currentStatus={requestStatus} />
          ) : (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{getSurveyorStatusMessage(requestStatus)}</p>
          )}
        </div>
      </article>

      <details className="card p-6">
        <summary className="cursor-pointer text-lg font-semibold">จัดการขั้นสูง (สำหรับผู้ดูแล)</summary>
        <p className="mt-1 text-sm text-slate-500">กรณีต้องปรับสถานะโดยตรงเท่านั้น</p>
        <div className="mt-4 max-w-md">
          <RequestStatusForm requestId={request.id} currentStatus={requestStatus} />
        </div>
      </details>
    </div>
  );
}
