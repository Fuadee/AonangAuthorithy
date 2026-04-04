'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { QueueRequestCard } from '@/components/queue/queue-request-card';
import { getCurrentSurveyDate, RequestStatus, ServiceRequest } from '@/lib/requests/types';

type SurveyorRequestsPanelProps = {
  requests: ServiceRequest[];
  defaultSurveyor?: string | null;
};

type SurveyorFilter =
  | 'ALL'
  | 'WAIT_DOCUMENT_REVIEW'
  | 'WAIT_DOCUMENT_FROM_CUSTOMER'
  | 'READY_FOR_SURVEY'
  | 'WAIT_CUSTOMER_FIX'
  | 'WAIT_FIX_REVIEW'
  | 'READY_FOR_RESURVEY'
  | 'IN_SURVEY'
  | 'TODAY'
  | 'SURVEY_COMPLETED'
  | 'WAIT_LAYOUT_DRAWING'
  | 'READY_TO_SEND_KRABI';

const ALL_SURVEYORS = 'ALL';

const FILTER_OPTIONS: Array<{ value: SurveyorFilter; label: string }> = [
  { value: 'ALL', label: 'ทั้งหมด' },
  { value: 'WAIT_DOCUMENT_REVIEW', label: 'รอตรวจเอกสาร' },
  { value: 'WAIT_DOCUMENT_FROM_CUSTOMER', label: 'รอผู้ใช้ไฟนำเอกสารมาให้' },
  { value: 'READY_FOR_SURVEY', label: 'พร้อมรับงานสำรวจ' },
  { value: 'WAIT_CUSTOMER_FIX', label: 'รอผู้ใช้ไฟแก้ไข' },
  { value: 'WAIT_FIX_REVIEW', label: 'รอตรวจจากรูป' },
  { value: 'READY_FOR_RESURVEY', label: 'รอนัดตรวจซ้ำ' },
  { value: 'IN_SURVEY', label: 'กำลังสำรวจ' },
  { value: 'TODAY', label: 'วันนี้' },
  { value: 'SURVEY_COMPLETED', label: 'สำรวจแล้ว' },
  { value: 'WAIT_LAYOUT_DRAWING', label: 'รอวาดผัง' },
  { value: 'READY_TO_SEND_KRABI', label: 'เตรียมส่งเอกสารให้กระบี่' }
];

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
      waitDocumentReview: surveyorFilteredRequests.filter((request) => request.status === 'WAIT_DOCUMENT_REVIEW').length,
      waitDocumentFromCustomer: surveyorFilteredRequests.filter((request) => request.status === 'WAIT_DOCUMENT_FROM_CUSTOMER').length,
      today: surveyorFilteredRequests.filter((request) => isToday(getCurrentSurveyDate(request))).length,
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
      return surveyorFilteredRequests.filter((request) => isToday(getCurrentSurveyDate(request)));
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
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        <article className="card p-4">
          <p className="text-sm text-slate-500">งานรอตรวจเอกสาร</p>
          <p className="mt-2 text-2xl font-semibold text-brand-700">{summary.waitDocumentReview}</p>
        </article>
        <article className="card p-4">
          <p className="text-sm text-slate-500">รอผู้ใช้ไฟนำเอกสารมาให้</p>
          <p className="mt-2 text-2xl font-semibold text-orange-700">{summary.waitDocumentFromCustomer}</p>
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

      <section className="space-y-3">
        {filteredRequests.map((request) => (
          <QueueRequestCard
            key={request.id}
            areaName={request.area_name}
            assigneeName={request.assignee_name}
            currentStatus={request.status}
            customerName={request.customer_name}
            detailHref={`/requests/${request.id}`}
            requestId={request.id}
            requestNo={request.request_no}
            requestType={request.request_type}
            surveyorName={request.assigned_surveyor}
            updatedAt={request.updated_at}
            workflowContext={{
              fixVerificationMode: request.fix_verification_mode,
              invoiceSignedAt: request.invoice_signed_at,
              paidAt: request.paid_at,
              scheduledSurveyDate: request.scheduled_survey_date,
              surveyDateCurrent: request.survey_date_current
            }}
          />
        ))}
        {!filteredRequests.length ? (
          <section className="card p-6 text-center text-sm text-slate-500">ไม่พบรายการตามตัวกรองนี้</section>
        ) : null}
      </section>
    </div>
  );
}
