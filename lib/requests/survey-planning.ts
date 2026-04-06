import { ServiceRequest, SURVEYOR_VISIBLE_STATUSES, RequestStatus, REQUEST_TYPE_LABELS, REQUEST_STATUS_LABELS, hasSurveyBeenRescheduled } from '@/lib/requests/types';
import { getSurveyorDisplayName, getSurveyorShortDisplayNames } from '@/lib/requests/surveyor-display';

export const SURVEY_PLANNING_ACTIVE_STATUSES: RequestStatus[] = SURVEYOR_VISIBLE_STATUSES.filter(
  (status) => status !== 'SURVEY_COMPLETED'
);

export type SurveyPlanningRequest = Pick<
  ServiceRequest,
  | 'id'
  | 'request_no'
  | 'customer_name'
  | 'request_type'
  | 'status'
  | 'assigned_surveyor'
  | 'assignee_name'
  | 'scheduled_survey_date'
  | 'survey_date_current'
  | 'survey_date_initial'
  | 'previous_survey_date'
  | 'survey_rescheduled_at'
>;

export type PlannedSurveyTask = {
  id: string;
  requestNo: string;
  customerName: string;
  requestTypeLabel: string;
  assigneeName: string;
  status: RequestStatus;
  statusLabel: string;
  dateKey: string;
  rescheduled: boolean;
};

export type DayPlanningSummary = {
  dateKey: string;
  total: number;
  byAssignee: Array<{ name: string; calendarDisplayName: string; total: number }>;
  tasks: PlannedSurveyTask[];
  density: 'none' | 'low' | 'medium' | 'high';
};

export function resolveLatestSurveyDate(
  request: Pick<SurveyPlanningRequest, 'survey_date_current' | 'scheduled_survey_date'>
): string | null {
  return request.survey_date_current ?? request.scheduled_survey_date;
}

export function toDateKey(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const directDateOnlyMatch = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  if (directDateOnlyMatch?.[1]) {
    return directDateOnlyMatch[1];
  }

  const parsedDate = new Date(trimmed);
  if (Number.isNaN(parsedDate.valueOf())) {
    return null;
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(parsedDate);
}

function getAssigneeDisplayName(request: SurveyPlanningRequest): string {
  const rawValue = request.assigned_surveyor ?? request.assignee_name;
  const displayName = getSurveyorDisplayName(rawValue);
  return displayName === '-' ? 'ยังไม่ระบุผู้สำรวจ' : displayName;
}

export function getDensityLevel(total: number): DayPlanningSummary['density'] {
  if (total <= 0) {
    return 'none';
  }
  if (total <= 2) {
    return 'low';
  }
  if (total <= 5) {
    return 'medium';
  }
  return 'high';
}

export function buildPlanningTasks(requests: SurveyPlanningRequest[]): PlannedSurveyTask[] {
  return requests
    .map((request) => {
      const dateKey = toDateKey(resolveLatestSurveyDate(request));
      if (!dateKey) {
        return null;
      }

      const assigneeName = getAssigneeDisplayName(request);

      return {
        id: request.id,
        requestNo: request.request_no,
        customerName: request.customer_name,
        requestTypeLabel: REQUEST_TYPE_LABELS[request.request_type],
        assigneeName,
        status: request.status,
        statusLabel: REQUEST_STATUS_LABELS[request.status],
        dateKey,
        rescheduled: hasSurveyBeenRescheduled(request)
      } satisfies PlannedSurveyTask;
    })
    .filter((task): task is PlannedSurveyTask => task !== null)
    .sort((left, right) => {
      if (left.dateKey !== right.dateKey) {
        return left.dateKey.localeCompare(right.dateKey);
      }
      if (left.assigneeName !== right.assigneeName) {
        return left.assigneeName.localeCompare(right.assigneeName, 'th');
      }
      return left.requestNo.localeCompare(right.requestNo, 'th');
    });
}

export function summarizePlanningByDate(tasks: PlannedSurveyTask[]): Map<string, DayPlanningSummary> {
  const grouped = new Map<string, PlannedSurveyTask[]>();

  for (const task of tasks) {
    const list = grouped.get(task.dateKey) ?? [];
    list.push(task);
    grouped.set(task.dateKey, list);
  }

  const result = new Map<string, DayPlanningSummary>();

  for (const [dateKey, dateTasks] of grouped.entries()) {
    const assigneeCounter = new Map<string, number>();

    for (const task of dateTasks) {
      assigneeCounter.set(task.assigneeName, (assigneeCounter.get(task.assigneeName) ?? 0) + 1);
    }

    const surveyorShortDisplayNames = getSurveyorShortDisplayNames(Array.from(assigneeCounter.keys()));

    const byAssignee = Array.from(assigneeCounter.entries())
      .map(([name, total]) => ({ name, calendarDisplayName: surveyorShortDisplayNames.get(name) ?? name, total }))
      .sort((left, right) => {
        if (right.total !== left.total) {
          return right.total - left.total;
        }
        return left.name.localeCompare(right.name, 'th');
      });

    result.set(dateKey, {
      dateKey,
      total: dateTasks.length,
      byAssignee,
      tasks: [...dateTasks],
      density: getDensityLevel(dateTasks.length)
    });
  }

  return result;
}

export function getMonthDateRange(anchorDate: Date): { from: string; to: string } {
  const start = new Date(Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth(), 1));
  const end = new Date(Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth() + 1, 0));

  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10)
  };
}

export function formatDateKeyThai(dateKey: string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString('th-TH', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    ...options
  });
}
