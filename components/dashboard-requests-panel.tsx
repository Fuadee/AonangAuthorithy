'use client';

import { useMemo, useState } from 'react';
import { DashboardSummary } from '@/components/dashboard-summary';
import { RequestTable } from '@/components/request-table';
import {
  getDashboardQueueGroups,
  getRequestQueueGroup,
  REQUEST_QUEUE_GROUP_META,
  RequestQueueGroup,
  RequestType,
  ServiceRequest
} from '@/lib/requests/types';

type RequestTypeFilter = 'ALL' | RequestType;
type QueueFilter = 'ALL' | RequestQueueGroup;

type DashboardRequestsPanelProps = {
  requests: ServiceRequest[];
  defaultQueue?: string | null;
};

type FilterChipProps = {
  label: string;
  isActive: boolean;
  onClick: () => void;
  activeClassName?: string;
};

type FilterGroupOption<T extends string> = {
  value: T;
  label: string;
  activeClassName?: string;
};

type FilterGroupProps<T extends string> = {
  label: string;
  options: FilterGroupOption<T>[];
  activeValue: T;
  onChange: (value: T) => void;
};

const FILTER_OPTIONS: Array<FilterGroupOption<RequestTypeFilter>> = [
  { value: 'ALL', label: 'ทั้งหมด' },
  { value: 'METER', label: 'ขอมีเตอร์' },
  { value: 'EXPANSION', label: 'ขยายเขต' }
];

const STATUS_STYLES = {
  survey: 'bg-blue-600',
  finance: 'bg-amber-500',
  manager: 'bg-indigo-600',
  document: 'bg-slate-500',
  operation: 'bg-purple-600',
  done: 'bg-green-600'
} as const;

const QUEUE_STYLE_KEY: Record<RequestQueueGroup, keyof typeof STATUS_STYLES | null> = {
  SURVEY: 'survey',
  BILLING: 'finance',
  MANAGER: 'manager',
  DISPATCH: 'document',
  KRABI: 'operation',
  DONE: 'done',
  OTHER: null
};

const FILTER_CHIP_BASE = 'rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-all';
const FILTER_CHIP_INACTIVE = 'bg-slate-100 text-slate-600 hover:bg-slate-200';
const FILTER_CHIP_ACTIVE = 'bg-[#1E3A8A] text-white';

function FilterChip({ label, isActive, onClick, activeClassName }: FilterChipProps) {
  return (
    <button
      className={`${FILTER_CHIP_BASE} ${isActive ? activeClassName ?? FILTER_CHIP_ACTIVE : FILTER_CHIP_INACTIVE}`}
      type="button"
      onClick={onClick}
      title={label}
    >
      {label}
    </button>
  );
}

function FilterGroup<T extends string>({ label, options, activeValue, onChange }: FilterGroupProps<T>) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3">
      <p className="text-sm font-medium text-slate-600 whitespace-nowrap">{label}</p>
      <div className="overflow-x-auto">
        <div className="flex min-w-max items-center gap-2">
          {options.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              isActive={activeValue === option.value}
              activeClassName={option.activeClassName}
              onClick={() => onChange(option.value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardRequestsPanel({ requests, defaultQueue }: DashboardRequestsPanelProps) {
  const [activeFilter, setActiveFilter] = useState<RequestTypeFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const defaultQueueFilter: QueueFilter =
    defaultQueue && getDashboardQueueGroups().includes(defaultQueue as RequestQueueGroup)
      ? (defaultQueue as RequestQueueGroup)
      : 'ALL';
  const [queueFilter, setQueueFilter] = useState<QueueFilter>(defaultQueueFilter);

  const filteredRequests = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const isSearchMatch = (request: ServiceRequest): boolean => {
      if (!normalizedQuery) {
        return true;
      }

      const searchableFields = [request.request_no, request.customer_name, request.assignee_name];
      return searchableFields.some((field) => field?.toLowerCase().includes(normalizedQuery));
    };

    let result = requests.filter(isSearchMatch);

    if (activeFilter !== 'ALL') {
      result = result.filter((request) => request.request_type === activeFilter);
    }

    if (queueFilter !== 'ALL') {
      result = result.filter((request) => getRequestQueueGroup(request.status) === queueFilter);
    }

    return result;
  }, [activeFilter, queueFilter, requests, searchQuery]);

  const queueItems = useMemo(
    () =>
      getDashboardQueueGroups().map((queue) => {
        const meta = REQUEST_QUEUE_GROUP_META[queue];
        return {
          queue,
          label: meta.label,
          href: meta.href,
          toneClass: meta.toneClass,
          count: requests.filter((request) => getRequestQueueGroup(request.status) === queue).length
        };
      }),
    [requests]
  );

  const queueFilterOptions: Array<FilterGroupOption<QueueFilter>> = useMemo(
    () => [
      { value: 'ALL', label: 'ทั้งหมด' },
      ...queueItems.map((item) => ({
        value: item.queue,
        label: item.label,
        activeClassName: QUEUE_STYLE_KEY[item.queue] ? STATUS_STYLES[QUEUE_STYLE_KEY[item.queue]] : undefined
      }))
    ],
    [queueItems]
  );

  return (
    <>
      <DashboardSummary queueItems={queueItems} />

      <section className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="ค้นหาเลขคำร้อง / ชื่อลูกค้า / ผู้รับผิดชอบ"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-10 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="ล้างคำค้นหา"
                  title="ล้างคำค้นหา"
                >
                  ×
                </button>
              )}
            </div>
            <FilterGroup label="ประเภท:" options={FILTER_OPTIONS} activeValue={activeFilter} onChange={setActiveFilter} />
            <FilterGroup label="สถานะ:" options={queueFilterOptions} activeValue={queueFilter} onChange={setQueueFilter} />
          </div>
        </div>

        <RequestTable
          requests={filteredRequests}
          emptyMessage={searchQuery.trim() ? 'ไม่พบรายการที่ตรงกับคำค้นหา' : 'ยังไม่มีคำร้อง'}
        />
      </section>
    </>
  );
}
