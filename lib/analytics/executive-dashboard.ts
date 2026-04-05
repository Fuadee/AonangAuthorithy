import {
  getRequestQueueGroup,
  getRequestQueueGroupLabel,
  getRequestStatusLabel,
  REQUEST_QUEUE_GROUPS,
  RequestQueueGroup,
  ServiceRequest
} from '@/lib/requests/types';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const BUSINESS_TIME_ZONE = 'Asia/Bangkok';
const BUSINESS_DAY_KEY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});
const BUSINESS_DAY_LABEL_FORMATTER = new Intl.DateTimeFormat('th-TH', {
  timeZone: BUSINESS_TIME_ZONE,
  day: '2-digit',
  month: 'short'
});

export const EXECUTIVE_TIME_RANGES = ['7D', '30D', 'THIS_MONTH', '90D'] as const;
export type ExecutiveTimeRange = (typeof EXECUTIVE_TIME_RANGES)[number];

export const EXECUTIVE_TIME_RANGE_LABELS: Record<ExecutiveTimeRange, string> = {
  '7D': '7 วัน',
  '30D': '30 วัน',
  THIS_MONTH: 'เดือนนี้',
  '90D': 'ย้อนหลัง 3 เดือน'
};

export const AGING_BUCKETS = [
  { key: 'LE_3', label: '≤ 3 วัน', min: 0, max: 3 },
  { key: 'D4_7', label: '4-7 วัน', min: 4, max: 7 },
  { key: 'D8_14', label: '8-14 วัน', min: 8, max: 14 },
  { key: 'GT_14', label: '> 14 วัน', min: 15, max: Number.POSITIVE_INFINITY }
] as const;

export type ExecutiveKpis = {
  total: number;
  completed: number;
  inProgress: number;
  problems: number;
  avgCycleTimeDays: number | null;
  rescheduled: number;
};

export type TrendPoint = {
  label: string;
  incoming: number;
  completed: number;
};

export type AnalyticsDebugSnapshot = {
  nowIso: string;
  timeRange: ExecutiveTimeRange;
  trendBucket: 'DAY' | 'WEEK';
  queryTotal: number;
  range: { fromIso: string; toIso: string };
  scopedTotal: number;
  latestRequest: {
    id: string;
    requestNo: string;
    createdAt: string;
    updatedAt: string;
    status: string;
    queueGroup: RequestQueueGroup;
    queueLabel: string;
  } | null;
  latestInQueryResult: boolean;
  latestInRangeFilter: boolean;
  latestCreatedDateKey: string | null;
  latestMappedBucketLabel: string | null;
  trendHasLatestBucket: boolean;
  trendLatestBucketIncoming: number | null;
  trendLatestBucketCompleted: number | null;
  kpiTotal: number;
  trendPoints: TrendPoint[];
};

export type BottleneckPoint = {
  queue: RequestQueueGroup;
  label: string;
  count: number;
};

export type AgingBucketPoint = {
  key: (typeof AGING_BUCKETS)[number]['key'];
  label: string;
  count: number;
};

export type ProblemFlags = {
  isRescheduled: boolean;
  isRejected: boolean;
  isAgingCritical: boolean;
  isLongerThanAverage: boolean;
};

export type ExecutiveRequestView = {
  id: string;
  requestNo: string;
  customerName: string;
  requestType: string;
  assigneeName: string;
  queue: RequestQueueGroup;
  statusLabel: string;
  createdAt: string;
  ageDays: number;
  flags: ProblemFlags;
};

function startOfDay(date: Date): Date {
  const output = new Date(date);
  output.setHours(0, 0, 0, 0);
  return output;
}

function endOfDay(date: Date): Date {
  const output = new Date(date);
  output.setHours(23, 59, 59, 999);
  return output;
}

export function resolveDateRange(range: ExecutiveTimeRange, now: Date = new Date()): { from: Date; to: Date } {
  const to = endOfDay(now);

  if (range === 'THIS_MONTH') {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to
    };
  }

  const days = range === '7D' ? 6 : range === '30D' ? 29 : 89;
  return {
    from: startOfDay(new Date(now.getTime() - days * DAY_IN_MS)),
    to
  };
}

function parseDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return null;
  }
  return parsed;
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / DAY_IN_MS));
}

function isCompleted(request: ServiceRequest): boolean {
  return request.status === 'COMPLETED' || request.status === 'COORDINATED_WITH_CONSTRUCTION';
}

export function getCompletedAt(request: ServiceRequest): Date | null {
  return parseDate(request.updated_at);
}

function detectRescheduled(request: ServiceRequest): boolean {
  return Boolean(
    request.survey_rescheduled_at ||
      request.previous_survey_date ||
      request.survey_reschedule_reason ||
      request.status === 'SURVEY_RESCHEDULE_REQUESTED'
  );
}

function detectRejected(request: ServiceRequest): boolean {
  return Boolean(request.reject_reason || request.rejected_at || request.status === 'KRABI_NEEDS_DOCUMENT_FIX');
}

export function computeRequestViews(
  requests: ServiceRequest[],
  averageCycleTimeDays: number | null,
  now: Date = new Date()
): ExecutiveRequestView[] {
  return requests
    .map((request) => {
      const createdAt = parseDate(request.created_at);
      if (!createdAt) {
        return null;
      }

      const ageDays = daysBetween(createdAt, now);
      const flags: ProblemFlags = {
        isRescheduled: detectRescheduled(request),
        isRejected: detectRejected(request),
        isAgingCritical: !isCompleted(request) && ageDays > 14,
        isLongerThanAverage: averageCycleTimeDays !== null && !isCompleted(request) && ageDays > averageCycleTimeDays
      };

      return {
        id: request.id,
        requestNo: request.request_no,
        customerName: request.customer_name,
        requestType: request.request_type === 'EXPANSION' ? 'ขยายเขต' : 'ขอมิเตอร์',
        assigneeName: request.assignee_name || request.assigned_surveyor || '-',
        queue: getRequestQueueGroup(request.status),
        statusLabel: getRequestStatusLabel(request.status),
        createdAt: request.created_at,
        ageDays,
        flags
      };
    })
    .filter((item): item is ExecutiveRequestView => Boolean(item));
}

export function computeExecutiveKpis(requests: ServiceRequest[], now: Date = new Date()): ExecutiveKpis {
  const completedRequests = requests.filter((request) => isCompleted(request));
  const cycleTimes = completedRequests
    .map((request) => {
      const createdAt = parseDate(request.created_at);
      const completedAt = getCompletedAt(request);
      if (!createdAt || !completedAt) {
        return null;
      }
      return daysBetween(createdAt, completedAt);
    })
    .filter((value): value is number => value !== null);

  const avgCycleTimeDays = cycleTimes.length ? Math.round(cycleTimes.reduce((sum, value) => sum + value, 0) / cycleTimes.length) : null;

  const views = computeRequestViews(requests, avgCycleTimeDays, now);

  return {
    total: requests.length,
    completed: completedRequests.length,
    inProgress: requests.length - completedRequests.length,
    problems: views.filter((item) => item.flags.isAgingCritical || item.flags.isRejected || item.flags.isLongerThanAverage).length,
    avgCycleTimeDays,
    rescheduled: views.filter((item) => item.flags.isRescheduled).length
  };
}

function getDateKey(date: Date): string {
  const parts = BUSINESS_DAY_KEY_FORMATTER.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('ไม่สามารถคำนวณวันที่ตามโซนเวลา Asia/Bangkok ได้');
  }

  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function formatDateLabel(dateKey: string): string {
  return BUSINESS_DAY_LABEL_FORMATTER.format(parseDateKey(dateKey));
}

function addDaysToDateKey(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatRangeLabel(from: Date, to: Date): string {
  return `${from.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })} - ${to.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: 'short'
  })}`;
}

export function computeTrend(
  requests: ServiceRequest[],
  range: { from: Date; to: Date },
  bucket: 'DAY' | 'WEEK'
): TrendPoint[] {
  if (bucket === 'DAY') {
    const incomingByDay = new Map<string, number>();
    const completedByDay = new Map<string, number>();

    requests.forEach((request) => {
      const createdAt = parseDate(request.created_at);
      if (createdAt) {
        const createdDateKey = getDateKey(createdAt);
        incomingByDay.set(createdDateKey, (incomingByDay.get(createdDateKey) ?? 0) + 1);
      }

      if (!isCompleted(request)) {
        return;
      }

      const completedAt = getCompletedAt(request);
      if (!completedAt) {
        return;
      }
      const completedDateKey = getDateKey(completedAt);
      completedByDay.set(completedDateKey, (completedByDay.get(completedDateKey) ?? 0) + 1);
    });

    const points: TrendPoint[] = [];
    const lastDateKey = getDateKey(range.to);
    for (let key = getDateKey(range.from); key <= lastDateKey; key = addDaysToDateKey(key, 1)) {
      const incoming = incomingByDay.get(key) ?? 0;
      const completed = completedByDay.get(key) ?? 0;

      points.push({
        label: formatDateLabel(key),
        incoming,
        completed
      });
    }
    return points;
  }

  const result: TrendPoint[] = [];
  let cursor = new Date(range.from);
  while (cursor <= range.to) {
    const weekStart = new Date(cursor);
    const weekEnd = new Date(Math.min(range.to.getTime(), weekStart.getTime() + 6 * DAY_IN_MS));

    const incoming = requests.filter((request) => {
      const createdAt = parseDate(request.created_at);
      return createdAt ? createdAt >= weekStart && createdAt <= weekEnd : false;
    }).length;

    const completed = requests.filter((request) => {
      if (!isCompleted(request)) {
        return false;
      }
      const completedAt = getCompletedAt(request);
      return completedAt ? completedAt >= weekStart && completedAt <= weekEnd : false;
    }).length;

    result.push({
      label: formatRangeLabel(weekStart, weekEnd),
      incoming,
      completed
    });

    cursor = new Date(weekEnd.getTime() + DAY_IN_MS);
  }

  return result;
}

export function computeBottlenecks(requests: ServiceRequest[]): BottleneckPoint[] {
  return REQUEST_QUEUE_GROUPS.filter((queue) => queue !== 'DONE')
    .map((queue) => ({
      queue,
      label: getRequestQueueGroupLabel(queue),
      count: requests.filter((request) => !isCompleted(request) && getRequestQueueGroup(request.status) === queue).length
    }))
    .sort((a, b) => b.count - a.count);
}

export function computeAgingBuckets(requests: ServiceRequest[], now: Date = new Date()): AgingBucketPoint[] {
  const activeRequests = requests.filter((request) => !isCompleted(request));

  return AGING_BUCKETS.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    count: activeRequests.filter((request) => {
      const createdAt = parseDate(request.created_at);
      if (!createdAt) {
        return false;
      }
      const age = daysBetween(createdAt, now);
      return age >= bucket.min && age <= bucket.max;
    }).length
  }));
}

export function computePerformanceByOwner(requests: ServiceRequest[], now: Date = new Date()) {
  const grouped = new Map<string, ServiceRequest[]>();

  for (const request of requests) {
    const key = request.assignee_name || request.assigned_surveyor || 'ไม่ระบุผู้รับผิดชอบ';
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)?.push(request);
  }

  return [...grouped.entries()]
    .map(([owner, items]) => {
      const completed = items.filter((item) => isCompleted(item)).length;
      const pending = items.length - completed;
      const rescheduled = items.filter((item) => detectRescheduled(item)).length;

      const completedDurations = items
        .filter((item) => isCompleted(item))
        .map((item) => {
          const createdAt = parseDate(item.created_at);
          const completedAt = getCompletedAt(item);
          return createdAt && completedAt ? daysBetween(createdAt, completedAt) : null;
        })
        .filter((value): value is number => value !== null);

      const avgCycle = completedDurations.length
        ? Math.round(completedDurations.reduce((sum, value) => sum + value, 0) / completedDurations.length)
        : null;

      const maxAge = items.reduce((max, item) => {
        const createdAt = parseDate(item.created_at);
        if (!createdAt) {
          return max;
        }
        return Math.max(max, daysBetween(createdAt, now));
      }, 0);

      return {
        owner,
        assigned: items.length,
        completed,
        pending,
        rescheduled,
        avgCycle,
        maxAge
      };
    })
    .sort((a, b) => b.pending - a.pending || b.assigned - a.assigned)
    .slice(0, 8);
}

export type DrilldownFilter = 'OVERDUE' | 'PROBLEM' | 'RESCHEDULED' | 'RECENT';

export function filterDrilldownRows(rows: ExecutiveRequestView[], filter: DrilldownFilter): ExecutiveRequestView[] {
  if (filter === 'OVERDUE') {
    return rows.filter((row) => row.flags.isAgingCritical).sort((a, b) => b.ageDays - a.ageDays);
  }
  if (filter === 'PROBLEM') {
    return rows
      .filter((row) => row.flags.isRejected || row.flags.isAgingCritical || row.flags.isLongerThanAverage)
      .sort((a, b) => b.ageDays - a.ageDays);
  }
  if (filter === 'RESCHEDULED') {
    return rows.filter((row) => row.flags.isRescheduled).sort((a, b) => b.ageDays - a.ageDays);
  }

  return [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function pickTrendBucket(range: ExecutiveTimeRange): 'DAY' | 'WEEK' {
  return range === '90D' ? 'WEEK' : 'DAY';
}

export function filterRequestsByRange(requests: ServiceRequest[], range: { from: Date; to: Date }): ServiceRequest[] {
  return requests.filter((request) => {
    const createdAt = parseDate(request.created_at);
    return createdAt ? createdAt >= range.from && createdAt <= range.to : false;
  });
}

export function buildAnalyticsDebugSnapshot(
  requests: ServiceRequest[],
  timeRange: ExecutiveTimeRange,
  now: Date = new Date(),
  latestRequestId?: string
): AnalyticsDebugSnapshot {
  const trendBucket = pickTrendBucket(timeRange);
  const range = resolveDateRange(timeRange, now);
  const scopedRequests = filterRequestsByRange(requests, range);
  const kpis = computeExecutiveKpis(scopedRequests, now);
  const trendPoints = computeTrend(scopedRequests, range, trendBucket);

  const latestRequest =
    requests.find((request) => request.id === latestRequestId) ??
    [...requests]
      .sort((a, b) => {
        const aTime = parseDate(a.created_at)?.getTime() ?? 0;
        const bTime = parseDate(b.created_at)?.getTime() ?? 0;
        return bTime - aTime;
      })
      .at(0) ??
    null;

  const latestCreatedAt = latestRequest ? parseDate(latestRequest.created_at) : null;
  const latestCreatedDateKey = latestCreatedAt ? getDateKey(latestCreatedAt) : null;
  const latestMappedBucketLabel = latestCreatedDateKey ? formatDateLabel(latestCreatedDateKey) : null;
  const latestTrendBucket = latestMappedBucketLabel ? trendPoints.find((point) => point.label === latestMappedBucketLabel) : null;

  return {
    nowIso: now.toISOString(),
    timeRange,
    trendBucket,
    queryTotal: requests.length,
    range: { fromIso: range.from.toISOString(), toIso: range.to.toISOString() },
    scopedTotal: scopedRequests.length,
    latestRequest: latestRequest
      ? {
          id: latestRequest.id,
          requestNo: latestRequest.request_no,
          createdAt: latestRequest.created_at,
          updatedAt: latestRequest.updated_at,
          status: latestRequest.status,
          queueGroup: getRequestQueueGroup(latestRequest.status),
          queueLabel: getRequestQueueGroupLabel(getRequestQueueGroup(latestRequest.status))
        }
      : null,
    latestInQueryResult: latestRequest ? requests.some((request) => request.id === latestRequest.id) : false,
    latestInRangeFilter: latestRequest ? scopedRequests.some((request) => request.id === latestRequest.id) : false,
    latestCreatedDateKey,
    latestMappedBucketLabel,
    trendHasLatestBucket: Boolean(latestTrendBucket),
    trendLatestBucketIncoming: latestTrendBucket?.incoming ?? null,
    trendLatestBucketCompleted: latestTrendBucket?.completed ?? null,
    kpiTotal: kpis.total,
    trendPoints
  };
}
