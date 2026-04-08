'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { DashboardSummary } from '@/components/dashboard-summary';
import { RequestTable } from '@/components/request-table';
import { buildFullAddress } from '@/lib/requests/address';
import {
  getDashboardQueueGroups,
  getRequestQueueGroup,
  REQUEST_QUEUE_GROUP_META,
  REQUEST_TYPES,
  RequestQueueGroup,
  RequestType,
  ServiceRequest
} from '@/lib/requests/types';

type RequestTypeFilter = 'ALL' | RequestType;
type QueueFilter = 'ALL' | RequestQueueGroup;

type DashboardRequestsPanelProps = {
  requests: ServiceRequest[];
  defaultQueue?: string | null;
  defaultType?: string | null;
};

type FilterChipProps = {
  label: string;
  isActive: boolean;
  onClick: () => void;
  tone?: 'default' | 'survey' | 'finance' | 'manager' | 'document' | 'operation' | 'done';
};

type FilterGroupOption<T extends string> = {
  value: T;
  label: string;
  tone?: FilterChipProps['tone'];
};

type FilterGroupProps<T extends string> = {
  label: string;
  options: FilterGroupOption<T>[];
  activeValue: T;
  onChange: (value: T) => void;
};

function resolveFilterLabel(value: string, label: string | null | undefined): string {
  const normalizedLabel = label?.trim();
  if (normalizedLabel) {
    return normalizedLabel;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[DashboardRequestsPanel] Missing filter label for key "${value}"`);
  }

  return value;
}

const FILTER_OPTIONS: Array<FilterGroupOption<RequestTypeFilter>> = [
  { value: 'ALL', label: 'ทั้งหมด' },
  { value: 'METER', label: 'ขอมิเตอร์' },
  { value: 'EXPANSION', label: 'ขยายเขต' },
  { value: 'METER_TO_3PHASE', label: 'เพิ่มเป็นมิเตอร์ 3 เฟส' }
];

const STATUS_STYLES = {
  default: 'bg-brand-600 hover:bg-brand-700 focus-visible:ring-brand-300 ring-brand-300/40',
  survey: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-300 ring-blue-300/40',
  finance: 'bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-300 ring-amber-300/40',
  manager: 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-300 ring-indigo-300/40',
  document: 'bg-slate-600 hover:bg-slate-700 focus-visible:ring-slate-300 ring-slate-300/40',
  operation: 'bg-purple-600 hover:bg-purple-700 focus-visible:ring-purple-300 ring-purple-300/40',
  done: 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-300 ring-emerald-300/40'
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

const FILTER_CHIP_BASE =
  'inline-flex h-9 items-center justify-center rounded-full border px-3.5 py-2 text-sm whitespace-nowrap transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white';
const FILTER_CHIP_INACTIVE =
  'border-slate-300/80 bg-slate-100 text-slate-700 hover:border-slate-400 hover:bg-slate-200 hover:text-slate-800';

function getActiveChipClass(tone: FilterChipProps['tone']) {
  return `border-transparent text-white font-semibold shadow-sm ring-1 ${STATUS_STYLES[tone ?? 'default']}`;
}

function FilterChip({ label, isActive, onClick, tone = 'default' }: FilterChipProps) {
  return (
    <button
      className={`${FILTER_CHIP_BASE} ${isActive ? getActiveChipClass(tone) : FILTER_CHIP_INACTIVE} ${isActive ? '' : 'font-medium'}`}
      type="button"
      onClick={onClick}
      title={label}
    >
      {label}
    </button>
  );
}

function FilterGroup<T extends string>({ label, options, activeValue, onChange }: FilterGroupProps<T>) {
  const safeOptions = useMemo(
    () =>
      options
        .map((option) => ({
          ...option,
          label: resolveFilterLabel(option.value, option.label)
        }))
        .filter((option) => option.label.trim().length > 0),
    [options]
  );

  return (
    <div className="grid gap-2 md:grid-cols-[72px_minmax(0,1fr)] md:items-center md:gap-3">
      <p className="text-sm font-medium text-slate-600 whitespace-nowrap">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        {safeOptions.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            isActive={activeValue === option.value}
            tone={option.tone}
            onClick={() => onChange(option.value)}
          />
        ))}
      </div>
    </div>
  );
}

export function DashboardRequestsPanel({ requests, defaultQueue, defaultType }: DashboardRequestsPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.toString();
  const defaultTypeFilter: RequestTypeFilter =
    defaultType && REQUEST_TYPES.includes(defaultType as RequestType) ? (defaultType as RequestType) : 'ALL';
  const [activeFilter, setActiveFilter] = useState<RequestTypeFilter>(defaultTypeFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [serverFilteredRequests, setServerFilteredRequests] = useState<ServiceRequest[] | null>(null);
  const [suggestions, setSuggestions] = useState<ServiceRequest[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const defaultQueueFilter: QueueFilter =
    defaultQueue && getDashboardQueueGroups().includes(defaultQueue as RequestQueueGroup)
      ? (defaultQueue as RequestQueueGroup)
      : 'ALL';
  const [queueFilter, setQueueFilter] = useState<QueueFilter>(defaultQueueFilter);

  useEffect(() => {
    const params = new URLSearchParams(currentQuery);
    if (activeFilter === 'ALL') {
      params.delete('type');
    } else {
      params.set('type', activeFilter);
    }
    if (queueFilter === 'ALL') {
      params.delete('queue');
    } else {
      params.set('queue', queueFilter);
    }
    const nextQuery = params.toString();
    if (nextQuery === currentQuery) {
      return;
    }
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [activeFilter, currentQuery, pathname, queueFilter, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 280);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;

    async function loadServerSearch() {
      if (!debouncedQuery) {
        setServerFilteredRequests(null);
        return;
      }
      setIsSearching(true);
      const params = new URLSearchParams({
        q: debouncedQuery,
        limit: '100'
      });
      if (activeFilter !== 'ALL') {
        params.set('request_type', activeFilter);
      }
      if (queueFilter !== 'ALL') {
        params.set('queue', queueFilter);
      }
      const response = await fetch(`/api/requests/search?${params.toString()}`);
      const payload = (await response.json()) as { data?: ServiceRequest[] };
      if (!cancelled) {
        setServerFilteredRequests(payload.data ?? []);
        setIsSearching(false);
      }
    }

    loadServerSearch().catch(() => {
      if (!cancelled) {
        setServerFilteredRequests([]);
        setIsSearching(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeFilter, debouncedQuery, queueFilter]);

  useEffect(() => {
    let cancelled = false;
    async function loadSuggestions() {
      if (debouncedQuery.length < 2) {
        setSuggestions([]);
        return;
      }
      const response = await fetch(`/api/requests/search?${new URLSearchParams({ q: debouncedQuery, limit: '6' }).toString()}`);
      const payload = (await response.json()) as { data?: ServiceRequest[] };
      if (!cancelled) {
        setSuggestions(payload.data ?? []);
      }
    }
    loadSuggestions().catch(() => {
      if (!cancelled) {
        setSuggestions([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const filteredRequests = useMemo(() => {
    let result = serverFilteredRequests ?? requests;

    if (activeFilter !== 'ALL') {
      result = result.filter((request) => request.request_type === activeFilter);
    }

    if (queueFilter !== 'ALL') {
      result = result.filter((request) => getRequestQueueGroup(request.status) === queueFilter);
    }

    return result;
  }, [activeFilter, queueFilter, requests, serverFilteredRequests]);

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
      { value: 'ALL', label: resolveFilterLabel('ALL', 'ทั้งหมด') },
      ...queueItems.map((item) => ({
        value: item.queue,
        label: resolveFilterLabel(item.queue, item.label),
        tone: QUEUE_STYLE_KEY[item.queue] ?? 'default'
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
                placeholder="ค้นหาเลขคำร้อง / ชื่อ / เบอร์โทร / บ้านเลขที่ / หมู่ / จุดสังเกต"
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
              {isSearching ? <div className="mt-1 text-xs text-slate-500">กำลังค้นหา...</div> : null}
              {suggestions.length > 0 ? (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                  {suggestions.map((item) => (
                    <Link
                      key={item.id}
                      href={`/requests/${item.id}`}
                      className="block rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <span className="font-medium">{item.request_no}</span>
                      <span> — {item.customer_name}</span>
                      <span className="text-slate-500"> — {buildFullAddress(item)}</span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            <FilterGroup label="ประเภท:" options={FILTER_OPTIONS} activeValue={activeFilter} onChange={setActiveFilter} />
            <FilterGroup label="สถานะ:" options={queueFilterOptions} activeValue={queueFilter} onChange={setQueueFilter} />
          </div>
        </div>

        <RequestTable
          requests={filteredRequests}
          emptyMessage={searchQuery.trim() ? 'ไม่พบรายการที่ตรงกับคำค้นหา' : 'ยังไม่มีคำร้อง'}
          responsibleColumnVariant="area_with_responsible"
        />
      </section>
    </>
  );
}
