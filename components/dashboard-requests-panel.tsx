'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { DashboardSummary } from '@/components/dashboard-summary';
import { RequestTable } from '@/components/request-table';
import { buildFullAddress } from '@/lib/requests/address';
import { REQUEST_INTENT_LABELS, REQUEST_INTENTS, RequestIntent } from '@/lib/requests/request-intent';
import { getPrimaryRequestType } from '@/lib/requests/request-display';
import {
  getDashboardSummaryQueueGroup,
  getDashboardQueueGroups,
  getRequestQueueGroup,
  isOverloadCompletedAwaitingKrabi,
  REQUEST_QUEUE_GROUP_META,
  RequestQueueGroup,
  ServiceRequest,
  WAITING_KRABI_DISPLAY_LABELS
} from '@/lib/requests/types';

type RequestTypeFilter = 'ALL' | RequestIntent;
type QueueFilter = 'ALL' | RequestQueueGroup | 'WAITING_KRABI';

type DashboardRequestsPanelProps = {
  requests: ServiceRequest[];
  defaultQueue?: string | null;
  defaultType?: string | null;
};

type FilterChipProps = {
  label: string;
  isActive: boolean;
  onClick: () => void;
  tone?: 'default' | 'survey' | 'alert' | 'manager' | 'document' | 'operation' | 'done';
};

type FilterGroupOption<T extends string> = {
  value: T;
  label: string;
  tone?: FilterChipProps['tone'];
};
type QueueSummaryItem = {
  queue: RequestQueueGroup | 'WAITING_KRABI';
  label: string;
  href: string;
  toneClass: string;
  count: number;
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
  ...REQUEST_INTENTS.map((intent) => ({ value: intent, label: REQUEST_INTENT_LABELS[intent] }))
];

function normalizeDashboardTypeFilter(value: string | null | undefined): RequestTypeFilter {
  const rawValue = value?.trim();
  if (!rawValue || rawValue === 'ALL') {
    return 'ALL';
  }

  if (REQUEST_INTENTS.includes(rawValue as RequestIntent)) {
    return rawValue as RequestIntent;
  }

  if (rawValue === 'METER' || rawValue === 'METER_30_100_1P' || rawValue === 'METER_30_100_3P') {
    return 'NEW_METER';
  }

  if (rawValue === 'METER_TO_3PHASE') {
    return 'PHASE_UPGRADE';
  }

  if (rawValue === 'EXPANSION') {
    return 'EXPANSION';
  }

  return 'ALL';
}

const STATUS_STYLES = {
  default: 'border-[#0B3FB3] bg-[#0F4ED8] text-white focus-visible:ring-[#155EEF] ring-[#155EEF]/60',
  survey: 'border-[#0B3FB3] bg-[#0F4ED8] text-white focus-visible:ring-[#155EEF] ring-[#155EEF]/60',
  alert: 'border-[#B45309] bg-[#EA8A00] text-white focus-visible:ring-[#F59E0B] ring-[#F59E0B]/60',
  manager: 'border-[#B45309] bg-[#EA8A00] text-white focus-visible:ring-[#F59E0B] ring-[#F59E0B]/60',
  document: 'border-[#475569] bg-[#E2E8F0] text-[#334155] focus-visible:ring-[#94A3B8] ring-[#94A3B8]/60',
  operation: 'border-[#0B3FB3] bg-[#0F4ED8] text-white focus-visible:ring-[#155EEF] ring-[#155EEF]/60',
  done: 'border-[#166534] bg-[#12813B] text-white focus-visible:ring-[#16A34A] ring-[#16A34A]/60'
} as const;

const QUEUE_STYLE_KEY: Record<RequestQueueGroup, keyof typeof STATUS_STYLES | null> = {
  SURVEY: 'survey',
  MANAGER: 'manager',
  DISPATCH: 'document',
  KRABI: 'operation',
  DONE: 'done',
  OTHER: null
};
const WAITING_KRABI_STYLE_KEY: FilterChipProps['tone'] = 'alert';

const FILTER_CHIP_BASE =
  'inline-flex min-h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold whitespace-nowrap shadow-[0_1px_3px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_3px_6px_rgba(15,23,42,0.16)] active:translate-y-0 active:shadow-[inset_0_2px_4px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white';
const FILTER_CHIP_INACTIVE =
  'border-[#94A3B8] bg-white text-[#334155] hover:border-[#64748B] hover:bg-[#F8FAFC]';

function getActiveChipClass(tone: FilterChipProps['tone']) {
  return `ring-1 ${STATUS_STYLES[tone ?? 'default']}`;
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
  const defaultTypeFilter: RequestTypeFilter = normalizeDashboardTypeFilter(defaultType);
  const [activeFilter, setActiveFilter] = useState<RequestTypeFilter>(defaultTypeFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [serverFilteredRequests, setServerFilteredRequests] = useState<ServiceRequest[] | null>(null);
  const [suggestions, setSuggestions] = useState<ServiceRequest[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const defaultQueueFilter: QueueFilter =
    defaultQueue && (getDashboardQueueGroups().includes(defaultQueue as RequestQueueGroup) || defaultQueue === 'WAITING_KRABI')
      ? (defaultQueue as QueueFilter)
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
        params.set('primary_type', activeFilter);
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
      result = result.filter((request) => getPrimaryRequestType(request) === activeFilter);
    }

    if (queueFilter !== 'ALL') {
      if (queueFilter === 'WAITING_KRABI') {
        result = result.filter((request) => isOverloadCompletedAwaitingKrabi(request));
      } else {
        result = result.filter((request) => !isOverloadCompletedAwaitingKrabi(request) && getRequestQueueGroup(request.status) === queueFilter);
      }
    }

    return result;
  }, [activeFilter, queueFilter, requests, serverFilteredRequests]);

  const queueItems = useMemo<QueueSummaryItem[]>(() => {
    return getDashboardQueueGroups().map((queue) => {
        const meta = REQUEST_QUEUE_GROUP_META[queue];
        return {
          queue,
          label: meta.label,
          href: meta.href,
          toneClass: meta.toneClass,
          count: requests.filter((request) => getDashboardSummaryQueueGroup(request) === queue).length
        };
      });
  }, [requests]);

  const queueFilterOptions: Array<FilterGroupOption<QueueFilter>> = useMemo(
    () => [
      { value: 'ALL', label: resolveFilterLabel('ALL', 'ทั้งหมด') },
      ...queueItems.map((item) => ({
        value: item.queue,
        label: resolveFilterLabel(item.queue, item.label),
        tone: item.queue === 'WAITING_KRABI' ? WAITING_KRABI_STYLE_KEY : (QUEUE_STYLE_KEY[item.queue] ?? 'default')
      })),
      {
        value: 'WAITING_KRABI',
        label: WAITING_KRABI_DISPLAY_LABELS.AONANG_INTERNAL,
        tone: WAITING_KRABI_STYLE_KEY
      }
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
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-10 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#1E40AF] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
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
