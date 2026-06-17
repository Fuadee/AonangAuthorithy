'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { AreaResponsibleCell } from '@/components/area-responsible-cell';
import { QueueFilterChips } from '@/components/queue/queue-filter-chips';
import { WorkflowActionButtons } from '@/components/workflow-action-buttons';
import { RequestTypeFlowCell } from '@/components/queue/request-type-flow-cell';
import { getRequestTypeDisplay } from '@/lib/requests/request-display';
import { getAvailableRequestActions } from '@/lib/requests/workflow-action-config';
import { getSurveyorDisplayName } from '@/lib/requests/surveyor-display';
import {
  formatThaiSurveyDate,
  getCurrentSurveyDate,
  getResponsiblePersonName,
  getRequestStatusLabelForDisplay,
  isSurveyScheduledTodayInBangkok,
  RequestStatus,
  ServiceRequest,
  SURVEYOR_PRIMARY_STATUS_MAP
} from '@/lib/requests/types';

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

function buildSurveyorSearchText(request: ServiceRequest): string {
  return [
    request.request_no,
    request.customer_name,
    request.phone,
    request.house_number,
    request.village_no,
    request.road,
    request.landmark,
    request.location_note,
    request.area_name,
    request.request_type,
    request.request_intent,
    getRequestTypeDisplay(request),
    request.assignee_name,
    request.assigned_surveyor,
    getSurveyorDisplayName(request.assigned_surveyor ?? request.assignee_name),
    getRequestStatusLabelForDisplay(request)
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('th-TH');
}

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
            {getSurveyorDisplayName(name)}
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
        {activeSurveyor === ALL_SURVEYORS ? `รวม ${focusedWorkload} งาน` : `${getSurveyorDisplayName(activeSurveyor)} • ${focusedWorkload} งาน`}
      </p>
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

export function SurveyorRequestsPanel({ requests, defaultSurveyor }: SurveyorRequestsPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeFilter, setActiveFilter] = useState<SurveyorFilter>('ALL');
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const searchedRequests = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('th-TH');
    if (!normalizedQuery) {
      return requests;
    }

    return requests.filter((request) => buildSurveyorSearchText(request).includes(normalizedQuery));
  }, [requests, searchQuery]);

  const surveyorFilteredRequests = useMemo(() => {
    if (activeSurveyor === ALL_SURVEYORS) {
      return searchedRequests;
    }

    return searchedRequests.filter((request) => request.assigned_surveyor === activeSurveyor);
  }, [activeSurveyor, searchedRequests]);

  const filteredRequests = useMemo(() => {
    if (activeFilter === 'ALL') {
      return surveyorFilteredRequests;
    }

    if (activeFilter in SURVEYOR_PRIMARY_STATUS_MAP) {
      const statuses = SURVEYOR_PRIMARY_STATUS_MAP[activeFilter as keyof typeof SURVEYOR_PRIMARY_STATUS_MAP];
      const byPrimaryStatus = surveyorFilteredRequests.filter((request) => statuses.includes(request.status));

      if (activeFilter === 'READY') {
        return byPrimaryStatus.filter((request) => isSurveyScheduledTodayInBangkok(request));
      }

      return byPrimaryStatus;
    }

    return surveyorFilteredRequests.filter((request) => request.status === activeFilter);
  }, [activeFilter, surveyorFilteredRequests]);

  const workloadBySurveyor = useMemo(() => {
    const bySurveyor = new Map<string, number>();

    filteredRequests.forEach((request) => {
      const key = request.assigned_surveyor ?? 'ยังไม่ระบุ';
      bySurveyor.set(key, (bySurveyor.get(key) ?? 0) + 1);
    });

    return Array.from(bySurveyor.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'th'));
  }, [filteredRequests]);

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
            <QueueFilterChips options={MAIN_FILTER_OPTIONS} active={activeFilter} onChange={setActiveFilter} />
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
                <QueueFilterChips options={DETAIL_FILTER_OPTIONS} active={activeFilter} onChange={setActiveFilter} />
              </div>
            ) : null}
          </div>
        </div>
      </FilterContainer>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-200 bg-white p-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="ค้นหาเลขคำร้อง / ชื่อ / เบอร์โทร / บ้านเลขที่ / หมู่ / จุดสังเกต"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-10 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="ล้างคำค้นหา"
                title="ล้างคำค้นหา"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 font-medium">เลขคำร้อง</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">ลูกค้า</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">ประเภท</th>
                <th className="w-64 px-4 py-3 font-medium">พื้นที่</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">สถานะ</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">วันที่สำรวจ</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {filteredRequests.map((request) => {
                const responsiblePersonName = getResponsiblePersonName(request);
                return (
                  <tr key={request.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-brand-700">
                    <Link className="hover:underline" href={`/requests/${request.id}`}>
                      {request.request_no}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{request.customer_name}</td>
                  <td className="px-4 py-3"><RequestTypeFlowCell request={request} /></td>
                  <td className="max-w-0 px-4 py-3 align-top">
                    <AreaResponsibleCell areaName={request.area_name} responsiblePersonName={responsiblePersonName} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <p>{getRequestStatusLabelForDisplay(request)}</p>
                      {request.status === 'RETURNED_FOR_RESURVEY' && request.manager_return_reason ? (
                        <p className="max-w-xs whitespace-pre-wrap text-xs text-rose-700">เหตุผลผู้จัดการ: {request.manager_return_reason}</p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">{formatThaiSurveyDate(getCurrentSurveyDate(request))}</td>
                  <td className="min-w-[220px] px-4 py-3">
                    <WorkflowActionButtons
                      actions={getAvailableRequestActions(request)}
                      compact
                      currentStatus={request.status}
                      maxVisibleActions={3}
                      requestId={request.id}
                      stayOnQueue
                    />
                  </td>
                  </tr>
                );
              })}
              {!filteredRequests.length && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={7}>
                    {searchQuery.trim()
                      ? 'ไม่พบรายการที่ตรงกับคำค้นหา'
                      : activeFilter === 'READY'
                        ? 'วันนี้ไม่มีงานที่นัดสำรวจ'
                        : 'ไม่พบรายการตามตัวกรองนี้'}
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
