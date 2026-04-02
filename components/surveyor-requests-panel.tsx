'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getRequestStatusLabel, RequestStatus, REQUEST_TYPE_LABELS, ServiceRequest } from '@/lib/requests/types';

type SurveyorRequestsPanelProps = {
  requests: ServiceRequest[];
  defaultSurveyor?: string | null;
};

type SurveyorFilter =
  | 'ALL'
  | 'PENDING_SURVEY_REVIEW'
  | 'SURVEY_ACCEPTED'
  | 'SURVEY_DOCS_INCOMPLETE'
  | 'SURVEY_RESCHEDULE_REQUESTED'
  | 'WAIT_SURVEYOR_SIGN'
  | 'TODAY'
  | 'SURVEY_COMPLETED';

const ALL_SURVEYORS = 'ALL';

const FILTER_OPTIONS: Array<{ value: SurveyorFilter; label: string }> = [
  { value: 'ALL', label: 'ทั้งหมด' },
  { value: 'PENDING_SURVEY_REVIEW', label: 'รอตรวจเอกสาร' },
  { value: 'SURVEY_ACCEPTED', label: 'รับงานแล้ว' },
  { value: 'SURVEY_DOCS_INCOMPLETE', label: 'เอกสารไม่ครบ' },
  { value: 'SURVEY_RESCHEDULE_REQUESTED', label: 'ขอเลื่อนวันสำรวจ' },
  { value: 'WAIT_SURVEYOR_SIGN', label: 'รอนักสำรวจเซ็น' },
  { value: 'TODAY', label: 'วันนี้' },
  { value: 'SURVEY_COMPLETED', label: 'สำรวจแล้ว' }
];

function formatSurveyDate(value: string | null): string {
  if (!value) {
    return '-';
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString('th-TH', { dateStyle: 'medium' });
}

function isToday(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = `${today.getMonth() + 1}`.padStart(2, '0');
  const dd = `${today.getDate()}`.padStart(2, '0');
  return value === `${yyyy}-${mm}-${dd}`;
}

export function SurveyorRequestsPanel({ requests, defaultSurveyor }: SurveyorRequestsPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeFilter, setActiveFilter] = useState<SurveyorFilter>('ALL');

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

  const summary = useMemo(
    () => ({
      pendingReview: surveyorFilteredRequests.filter((request) => request.status === 'PENDING_SURVEY_REVIEW').length,
      accepted: surveyorFilteredRequests.filter((request) => request.status === 'SURVEY_ACCEPTED').length,
      docsIncomplete: surveyorFilteredRequests.filter((request) => request.status === 'SURVEY_DOCS_INCOMPLETE').length,
      today: surveyorFilteredRequests.filter((request) => isToday(request.scheduled_survey_date)).length,
      completed: surveyorFilteredRequests.filter((request) => request.status === 'SURVEY_COMPLETED').length
    }),
    [surveyorFilteredRequests]
  );

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

    if (activeFilter === 'TODAY') {
      return surveyorFilteredRequests.filter((request) => isToday(request.scheduled_survey_date));
    }

    return surveyorFilteredRequests.filter((request) => request.status === (activeFilter as RequestStatus));
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
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <article className="card p-4">
          <p className="text-sm text-slate-500">งานรอตรวจเอกสาร</p>
          <p className="mt-2 text-2xl font-semibold text-brand-700">{summary.pendingReview}</p>
        </article>
        <article className="card p-4">
          <p className="text-sm text-slate-500">งานรับแล้ว</p>
          <p className="mt-2 text-2xl font-semibold text-brand-700">{summary.accepted}</p>
        </article>
        <article className="card p-4">
          <p className="text-sm text-slate-500">งานเอกสารไม่ครบ</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">{summary.docsIncomplete}</p>
        </article>
        <article className="card p-4">
          <p className="text-sm text-slate-500">งานนัดสำรวจวันนี้</p>
          <p className="mt-2 text-2xl font-semibold text-sky-700">{summary.today}</p>
        </article>
        <article className="card p-4">
          <p className="text-sm text-slate-500">งานสำรวจแล้ว</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{summary.completed}</p>
        </article>
      </section>

      <section className="card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-700">นักสำรวจ</p>
            <select
              aria-label="กรองตามนักสำรวจ"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              value={activeSurveyor}
              onChange={(event) => handleSurveyorChange(event.target.value)}
            >
              <option value={ALL_SURVEYORS}>ทั้งหมด</option>
              {surveyorOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <p className="text-sm text-slate-500">
            {activeSurveyor === ALL_SURVEYORS ? 'กำลังแสดง: งานนักสำรวจทั้งหมด' : `กำลังกรอง: ${activeSurveyor}`}
          </p>
        </div>
      </section>

      <section className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          {FILTER_OPTIONS.map((option) => {
            const isActive = activeFilter === option.value;

            return (
              <button
                key={option.value}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  isActive
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
                type="button"
                onClick={() => setActiveFilter(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card p-4">
        <p className="text-sm font-medium text-slate-700">ภาระงานต่อคน</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {workloadBySurveyor.map((item) => (
            <span key={item.name} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
              {item.name}: {item.total} งาน
            </span>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">เลขคำร้อง</th>
                <th className="px-4 py-3 font-medium">ชื่อลูกค้า</th>
                <th className="px-4 py-3 font-medium">ประเภทคำร้อง</th>
                <th className="px-4 py-3 font-medium">พื้นที่</th>
                <th className="px-4 py-3 font-medium">นักสำรวจ</th>
                <th className="px-4 py-3 font-medium">วันสำรวจ</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-brand-700">{request.request_no}</td>
                  <td className="px-4 py-3">{request.customer_name}</td>
                  <td className="px-4 py-3">{REQUEST_TYPE_LABELS[request.request_type]}</td>
                  <td className="px-4 py-3">{request.area_name}</td>
                  <td className="px-4 py-3">{request.assigned_surveyor ?? '-'}</td>
                  <td className="px-4 py-3">{formatSurveyDate(request.scheduled_survey_date)}</td>
                  <td className="px-4 py-3">{getRequestStatusLabel(request.status)}</td>
                  <td className="px-4 py-3">
                    <Link className="btn-secondary" href={`/requests/${request.id}`}>
                      เปิดดู
                    </Link>
                  </td>
                </tr>
              ))}
              {!filteredRequests.length && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={8}>
                    ไม่พบรายการตามตัวกรองนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
