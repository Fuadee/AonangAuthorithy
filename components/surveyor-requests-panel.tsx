'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { startSurveyAction, updateDocumentReviewDecisionAction, updateSurveyorAction } from '@/app/actions';
import { getRequestStatusLabel, RequestStatus, REQUEST_TYPE_LABELS, ServiceRequest } from '@/lib/requests/types';

type SurveyorRequestsPanelProps = {
  requests: ServiceRequest[];
  defaultSurveyor?: string | null;
};

type MainSurveyorFilter = 'ALL' | 'WAITING_REVIEW' | 'READY' | 'IN_PROGRESS' | 'DONE';
type DetailSurveyorFilter = Extract<RequestStatus, 'WAIT_DOCUMENT_FROM_CUSTOMER' | 'WAIT_CUSTOMER_FIX' | 'WAIT_FIX_REVIEW' | 'READY_FOR_RESURVEY'>;
type SurveyorFilter = MainSurveyorFilter | DetailSurveyorFilter;

type StatusOption<T extends string> = {
  value: T;
  label: string;
};

const ALL_SURVEYORS = 'ALL';

const MAIN_FILTER_OPTIONS: StatusOption<MainSurveyorFilter>[] = [
  { value: 'ALL', label: 'ทั้งหมด' },
  { value: 'WAITING_REVIEW', label: 'รอตรวจ' },
  { value: 'READY', label: 'พร้อมสำรวจ' },
  { value: 'IN_PROGRESS', label: 'กำลังทำ' },
  { value: 'DONE', label: 'เสร็จ' }
];

const DETAIL_FILTER_OPTIONS: StatusOption<DetailSurveyorFilter>[] = [
  { value: 'WAIT_DOCUMENT_FROM_CUSTOMER', label: 'รอเอกสารเพิ่ม' },
  { value: 'WAIT_CUSTOMER_FIX', label: 'รอผู้ใช้ไฟแก้ไข' },
  { value: 'WAIT_FIX_REVIEW', label: 'รอตรวจจากรูป' },
  { value: 'READY_FOR_RESURVEY', label: 'รอนัดตรวจซ้ำ' }
];

const MAIN_FILTER_STATUS_MAP: Record<Exclude<MainSurveyorFilter, 'ALL'>, RequestStatus[]> = {
  WAITING_REVIEW: ['WAIT_DOCUMENT_REVIEW', 'PENDING_SURVEY_REVIEW'],
  READY: ['READY_FOR_SURVEY', 'SURVEY_ACCEPTED', 'SURVEY_RESCHEDULE_REQUESTED'],
  IN_PROGRESS: ['IN_SURVEY'],
  DONE: ['SURVEY_COMPLETED']
};

function SurveyorSelect({
  activeSurveyor,
  options,
  onChange
}: {
  activeSurveyor: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-slate-500">นักสำรวจ</p>
      <select
        aria-label="กรองตามนักสำรวจ"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 sm:min-w-64"
        value={activeSurveyor}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value={ALL_SURVEYORS}>ทั้งหมด</option>
        {options.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}

function WorkloadSummary({ activeSurveyor, workloadBySurveyor }: { activeSurveyor: string; workloadBySurveyor: Array<{ name: string; total: number }> }) {
  const focusedWorkload =
    activeSurveyor === ALL_SURVEYORS
      ? workloadBySurveyor.reduce((sum, item) => sum + item.total, 0)
      : (workloadBySurveyor.find((item) => item.name === activeSurveyor)?.total ?? 0);

  return (
    <div className="text-right">
      <p className="text-sm text-slate-500">ภาระงานต่อคน</p>
      <p className="text-base font-semibold text-slate-800">
        {activeSurveyor === ALL_SURVEYORS ? `รวม ${focusedWorkload} งาน` : `${activeSurveyor} • ${focusedWorkload} งาน`}
      </p>
    </div>
  );
}

function StatusChips<T extends string>({
  options,
  active,
  onChange
}: {
  options: StatusOption<T>[];
  active: string;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = active === option.value;

        return (
          <button
            key={option.value}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition ${
              isActive
                ? 'border-brand-600 bg-brand-50 text-brand-700'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
            type="button"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function FilterContainer({
  children
}: {
  children: ReactNode;
}) {
  return <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">{children}</section>;
}

type ActionModalProps = {
  requestId: string;
  requestNo: string;
  currentStatus: RequestStatus;
  onClose: () => void;
};

function ActionModal({ requestId, requestNo, currentStatus, onClose }: ActionModalProps) {
  const [selectedAction, setSelectedAction] = useState<'DOC_COMPLETE' | 'DOCS_INCOMPLETE' | 'ACCEPT_JOB' | 'RESCHEDULE'>('DOC_COMPLETE');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h4 className="text-lg font-semibold text-slate-900">ดำเนินการคำร้อง {requestNo}</h4>
        <p className="mt-1 text-sm text-slate-500">สถานะปัจจุบัน: {getRequestStatusLabel(currentStatus)}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className={`rounded-lg border px-3 py-2 text-sm ${selectedAction === 'DOC_COMPLETE' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-700'}`} type="button" onClick={() => setSelectedAction('DOC_COMPLETE')}>
            เอกสารครบ
          </button>
          <button className={`rounded-lg border px-3 py-2 text-sm ${selectedAction === 'DOCS_INCOMPLETE' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-700'}`} type="button" onClick={() => setSelectedAction('DOCS_INCOMPLETE')}>
            เอกสารไม่ครบ
          </button>
          <button className={`rounded-lg border px-3 py-2 text-sm ${selectedAction === 'ACCEPT_JOB' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-700'}`} type="button" onClick={() => setSelectedAction('ACCEPT_JOB')}>
            รับงาน
          </button>
          <button className={`rounded-lg border px-3 py-2 text-sm ${selectedAction === 'RESCHEDULE' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-700'}`} type="button" onClick={() => setSelectedAction('RESCHEDULE')}>
            เลื่อนนัด
          </button>
        </div>

        {selectedAction === 'DOC_COMPLETE' ? (
          <form action={updateDocumentReviewDecisionAction} className="mt-4 space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <input name="decision" type="hidden" value="COMPLETE" />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={onClose}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยันเอกสารครบ</button>
            </div>
          </form>
        ) : null}

        {selectedAction === 'DOCS_INCOMPLETE' ? (
          <form action={updateSurveyorAction} className="mt-4 space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <input name="action" type="hidden" value="DOCS_INCOMPLETE" />
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor={`survey_note_${requestId}`}>
                หมายเหตุเอกสารขาด
              </label>
              <textarea className="input mt-1 min-h-24" id={`survey_note_${requestId}`} name="survey_note" required />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={onClose}>ยกเลิก</button>
              <button className="btn-primary" type="submit">บันทึกเอกสารไม่ครบ</button>
            </div>
          </form>
        ) : null}

        {selectedAction === 'ACCEPT_JOB' ? (
          <form action={startSurveyAction} className="mt-4 space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={onClose}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยันรับงาน</button>
            </div>
          </form>
        ) : null}

        {selectedAction === 'RESCHEDULE' ? (
          <form action={updateSurveyorAction} className="mt-4 space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <input name="action" type="hidden" value="REQUEST_RESCHEDULE" />
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor={`survey_reschedule_${requestId}`}>
                วันสำรวจใหม่
              </label>
              <input className="input mt-1" id={`survey_reschedule_${requestId}`} name="survey_reschedule_date" required type="date" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor={`survey_reschedule_note_${requestId}`}>
                เหตุผล/หมายเหตุ (ถ้ามี)
              </label>
              <textarea className="input mt-1 min-h-20" id={`survey_reschedule_note_${requestId}`} name="survey_note" />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={onClose}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยันเลื่อนนัด</button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}

export function SurveyorRequestsPanel({ requests, defaultSurveyor }: SurveyorRequestsPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeFilter, setActiveFilter] = useState<SurveyorFilter>('ALL');
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeActionRequest, setActiveActionRequest] = useState<{ id: string; requestNo: string; status: RequestStatus } | null>(null);

  const surveyorOptions = useMemo(() => {
    const unique = new Set<string>();

    requests.forEach((request) => {
      if (request.assigned_surveyor) {
        unique.add(request.assigned_surveyor);
      }
    });

    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'th'));
  }, [requests]);

  const selectedSurveyor = useMemo(() => {
    if (!defaultSurveyor || !surveyorOptions.includes(defaultSurveyor)) {
      return ALL_SURVEYORS;
    }

    return defaultSurveyor;
  }, [defaultSurveyor, surveyorOptions]);

  const [activeSurveyor, setActiveSurveyor] = useState<string>(selectedSurveyor);

  useEffect(() => {
    setActiveSurveyor(selectedSurveyor);
  }, [selectedSurveyor]);

  const surveyorFilteredRequests = useMemo(() => {
    if (activeSurveyor === ALL_SURVEYORS) {
      return requests;
    }

    return requests.filter((request) => request.assigned_surveyor === activeSurveyor);
  }, [activeSurveyor, requests]);

  const workloadBySurveyor = useMemo(() => {
    const bySurveyor = new Map<string, number>();

    requests.forEach((request) => {
      const key = request.assigned_surveyor ?? 'ยังไม่ระบุ';
      bySurveyor.set(key, (bySurveyor.get(key) ?? 0) + 1);
    });

    return Array.from(bySurveyor.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'th'));
  }, [requests]);

  const filteredRequests = useMemo(() => {
    if (activeFilter === 'ALL') {
      return surveyorFilteredRequests;
    }

    if (activeFilter in MAIN_FILTER_STATUS_MAP) {
      const statuses = MAIN_FILTER_STATUS_MAP[activeFilter as keyof typeof MAIN_FILTER_STATUS_MAP];
      return surveyorFilteredRequests.filter((request) => statuses.includes(request.status));
    }

    return surveyorFilteredRequests.filter((request) => request.status === activeFilter);
  }, [activeFilter, surveyorFilteredRequests]);

  const handleSurveyorChange = (value: string) => {
    setActiveSurveyor(value);

    const nextParams = new URLSearchParams(searchParams.toString());
    if (value === ALL_SURVEYORS) {
      nextParams.delete('surveyor');
    } else {
      nextParams.set('surveyor', value);
    }

    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="space-y-4">
      <FilterContainer>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SurveyorSelect activeSurveyor={activeSurveyor} options={surveyorOptions} onChange={handleSurveyorChange} />
            <WorkloadSummary activeSurveyor={activeSurveyor} workloadBySurveyor={workloadBySurveyor} />
          </div>

          <div className="space-y-1">
            <p className="text-sm text-slate-500">สถานะหลัก</p>
            <StatusChips options={MAIN_FILTER_OPTIONS} active={activeFilter} onChange={setActiveFilter} />
          </div>

          <div className="space-y-2">
            <button
              type="button"
              className="text-sm font-medium text-brand-700 hover:text-brand-800"
              onClick={() => setIsExpanded((prev) => !prev)}
            >
              {isExpanded ? '− ซ่อนตัวกรองเพิ่มเติม' : '+ ตัวกรองเพิ่มเติม'}
            </button>
            {isExpanded ? (
              <div className="space-y-1">
                <p className="text-sm text-slate-500">สถานะย่อย</p>
                <StatusChips options={DETAIL_FILTER_OPTIONS} active={activeFilter} onChange={setActiveFilter} />
              </div>
            ) : null}
          </div>
        </div>
      </FilterContainer>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 font-medium">เลขคำร้อง</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">ลูกค้า</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">ประเภท</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">พื้นที่</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">สถานะ</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">อัปเดตล่าสุด</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-brand-700">{request.request_no}</td>
                  <td className="px-4 py-3">{request.customer_name}</td>
                  <td className="px-4 py-3">{REQUEST_TYPE_LABELS[request.request_type]}</td>
                  <td className="px-4 py-3">{request.area_name}</td>
                  <td className="px-4 py-3">{getRequestStatusLabel(request.status)}</td>
                  <td className="px-4 py-3">{new Date(request.updated_at).toLocaleString('th-TH')}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link className="btn-secondary" href={`/requests/${request.id}`}>
                        เปิดดู
                      </Link>
                      <button
                        className="btn-primary"
                        type="button"
                        onClick={() => setActiveActionRequest({ id: request.id, requestNo: request.request_no, status: request.status })}
                      >
                        ดำเนินการ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredRequests.length && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={7}>
                    ไม่พบรายการตามตัวกรองนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {activeActionRequest ? (
        <ActionModal
          currentStatus={activeActionRequest.status}
          requestId={activeActionRequest.id}
          requestNo={activeActionRequest.requestNo}
          onClose={() => setActiveActionRequest(null)}
        />
      ) : null}
    </div>
  );
}
