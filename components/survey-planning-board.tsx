'use client';

import { useMemo, useState } from 'react';
import {
  buildPlanningTasks,
  DayPlanningSummary,
  formatDateKeyThai,
  summarizePlanningByDate,
  SurveyPlanningRequest,
  toDateKey
} from '@/lib/requests/survey-planning';

type SurveyPlanningBoardProps = {
  requests: SurveyPlanningRequest[];
};

type CalendarViewMode = 'month' | 'week';

type CalendarDayCell = {
  date: Date;
  dateKey: string;
  inCurrentMonth: boolean;
};

const WEEKDAY_LABELS = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];

function toDateKeyFromDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfWeekMonday(date: Date): Date {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = result.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  result.setUTCDate(result.getUTCDate() + offset);
  return result;
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}

function getMonthCalendarCells(currentMonth: Date): CalendarDayCell[] {
  const monthStart = startOfMonth(currentMonth);
  const gridStart = startOfWeekMonday(monthStart);

  return Array.from({ length: 42 }, (_, index) => {
    const dayDate = addDays(gridStart, index);

    return {
      date: dayDate,
      dateKey: toDateKeyFromDate(dayDate),
      inCurrentMonth: dayDate.getUTCMonth() === monthStart.getUTCMonth()
    };
  });
}

function getWeekCalendarCells(anchorDate: Date): CalendarDayCell[] {
  const weekStart = startOfWeekMonday(anchorDate);

  return Array.from({ length: 7 }, (_, index) => {
    const dayDate = addDays(weekStart, index);
    return {
      date: dayDate,
      dateKey: toDateKeyFromDate(dayDate),
      inCurrentMonth: dayDate.getUTCMonth() === anchorDate.getUTCMonth()
    };
  });
}

function getDensityClass(density: DayPlanningSummary['density']): string {
  switch (density) {
    case 'high':
      return 'border-[#C7D2FE] bg-[#F8FAFF]';
    case 'medium':
      return 'border-[#DBEAFE] bg-[#FBFDFF]';
    case 'low':
      return 'border-[#E2E8F0] bg-[#FEFEFF]';
    case 'none':
    default:
      return 'border-[#E2E8F0] bg-white';
  }
}

function getStatusBadgeClass(status: string): string {
  if (status.includes('เลื่อน')) {
    return 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]';
  }

  if (status.includes('รอ') || status.includes('คิว')) {
    return 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1E40AF]';
  }

  if (status.includes('เสร็จ') || status.includes('สำเร็จ')) {
    return 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]';
  }

  return 'border-[#CBD5E1] bg-[#F8FAFC] text-[#334155]';
}

function summarizeMonth(
  dateMap: Map<string, DayPlanningSummary>,
  monthDate: Date
): {
  totalTasks: number;
  activeDays: number;
  busiestDay: DayPlanningSummary | null;
  byAssignee: Array<{ name: string; total: number }>;
  rescheduledCount: number;
} {
  const start = startOfMonth(monthDate);
  const end = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0));
  const startKey = toDateKeyFromDate(start);
  const endKey = toDateKeyFromDate(end);

  const monthEntries = Array.from(dateMap.values()).filter((entry) => entry.dateKey >= startKey && entry.dateKey <= endKey);

  const totalTasks = monthEntries.reduce((sum, entry) => sum + entry.total, 0);
  const activeDays = monthEntries.length;

  const busiestDay = monthEntries.reduce<DayPlanningSummary | null>((current, entry) => {
    if (!current || entry.total > current.total) {
      return entry;
    }
    return current;
  }, null);

  const assigneeCounter = new Map<string, number>();
  let rescheduledCount = 0;

  for (const entry of monthEntries) {
    for (const task of entry.tasks) {
      assigneeCounter.set(task.assigneeName, (assigneeCounter.get(task.assigneeName) ?? 0) + 1);
      if (task.rescheduled) {
        rescheduledCount += 1;
      }
    }
  }

  const byAssignee = Array.from(assigneeCounter.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((left, right) => right.total - left.total);

  return {
    totalTasks,
    activeDays,
    busiestDay,
    byAssignee,
    rescheduledCount
  };
}

function MonthCell({
  cell,
  summary,
  selected,
  onSelect
}: {
  cell: CalendarDayCell;
  summary: DayPlanningSummary | null;
  selected: boolean;
  onSelect: (dateKey: string) => void;
}) {
  const hasTask = Boolean(summary && summary.total > 0);
  const surveyorNames = summary?.byAssignee.slice(0, 2) ?? [];
  const hiddenSurveyorCount = Math.max((summary?.byAssignee.length ?? 0) - surveyorNames.length, 0);

  return (
    <button
      className={`group min-h-[120px] rounded-2xl border p-2 text-left transition-all duration-150 ${getDensityClass(summary?.density ?? 'none')} ${
        selected
          ? 'border-[#93C5FD] bg-[#EFF6FF] shadow-[0_6px_16px_-12px_rgba(30,58,138,0.55)] ring-1 ring-[#1E3A8A]/20'
          : 'hover:border-[#BFDBFE] hover:shadow-[0_8px_18px_-16px_rgba(15,23,42,0.35)]'
      }`}
      onClick={() => onSelect(cell.dateKey)}
      type="button"
    >
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <span className={`text-sm font-semibold leading-none ${cell.inCurrentMonth ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>
            {cell.date.getUTCDate()}
          </span>
          {hasTask ? (
            <span className="inline-flex items-center rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-medium text-[#1D4ED8]">
              {summary?.total} งาน
            </span>
          ) : null}
        </div>

        <div className="mt-2 space-y-1">
          {surveyorNames.map((assignee) => (
            <p key={assignee.name} className="truncate text-[11px] font-medium text-[#334155]">
              {assignee.calendarDisplayName}
            </p>
          ))}

          {hiddenSurveyorCount > 0 ? <p className="text-[11px] font-medium text-[#64748B]">+อีก {hiddenSurveyorCount}</p> : null}
        </div>
      </div>
    </button>
  );
}

export function SurveyPlanningBoard({ requests }: SurveyPlanningBoardProps) {
  const todayKey = toDateKey(new Date().toISOString()) ?? toDateKeyFromDate(new Date());
  const initialMonth = startOfMonth(new Date());

  const tasks = useMemo(() => buildPlanningTasks(requests), [requests]);
  const dateMap = useMemo(() => summarizePlanningByDate(tasks), [tasks]);

  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);

  const summaryStats = useMemo(() => summarizeMonth(dateMap, currentMonth), [currentMonth, dateMap]);

  const monthCells = useMemo(() => getMonthCalendarCells(currentMonth), [currentMonth]);
  const selectedDate = useMemo(() => new Date(`${selectedDateKey}T00:00:00`), [selectedDateKey]);
  const weekCells = useMemo(() => getWeekCalendarCells(selectedDate), [selectedDate]);

  const selectedSummary = dateMap.get(selectedDateKey) ?? null;

  const monthLabel = currentMonth.toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric'
  });

  const goToPrevious = () => {
    if (viewMode === 'month') {
      setCurrentMonth((prev) => new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() - 1, 1)));
      return;
    }

    const next = addDays(selectedDate, -7);
    setSelectedDateKey(toDateKeyFromDate(next));
    setCurrentMonth(startOfMonth(next));
  };

  const goToNext = () => {
    if (viewMode === 'month') {
      setCurrentMonth((prev) => new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + 1, 1)));
      return;
    }

    const next = addDays(selectedDate, 7);
    setSelectedDateKey(toDateKeyFromDate(next));
    setCurrentMonth(startOfMonth(next));
  };

  const goToToday = () => {
    const now = new Date();
    const nowKey = toDateKeyFromDate(now);
    setSelectedDateKey(nowKey);
    setCurrentMonth(startOfMonth(now));
  };

  return (
    <div className="space-y-5">
      <section className="card border-[#E2E8F0] bg-white/95 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold leading-tight text-[#0F172A]">แผนงานสำรวจรายเดือน</h2>
            <p className="mt-1 text-sm leading-relaxed text-[#64748B]">ภาพรวมงานนัดสำรวจของทีม พร้อมตรวจสอบภาระงานรายวัน</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1.5">
            <button
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[#D6DFEA] bg-white px-3 text-sm font-medium text-[#334155] transition hover:border-[#BFDBFE] hover:text-[#1E3A8A]"
              onClick={goToPrevious}
              type="button"
            >
              เดือนก่อนหน้า
            </button>
            <button
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[#D6DFEA] bg-white px-3 text-sm font-medium text-[#334155] transition hover:border-[#BFDBFE] hover:text-[#1E3A8A]"
              onClick={goToToday}
              type="button"
            >
              วันนี้
            </button>
            <button
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[#D6DFEA] bg-white px-3 text-sm font-medium text-[#334155] transition hover:border-[#BFDBFE] hover:text-[#1E3A8A]"
              onClick={goToNext}
              type="button"
            >
              เดือนถัดไป
            </button>
            <div className="inline-flex h-9 items-center rounded-lg border border-[#D6DFEA] bg-white p-0.5 text-sm">
              <button
                className={`rounded-md px-3 py-1.5 font-medium transition ${
                  viewMode === 'month'
                    ? 'border border-[#BFDBFE] bg-[#EFF6FF] text-[#1E3A8A] shadow-[0_1px_2px_rgba(30,58,138,0.15)]'
                    : 'text-[#64748B] hover:text-[#334155]'
                }`}
                onClick={() => setViewMode('month')}
                type="button"
              >
                เดือน
              </button>
              <button
                className={`rounded-md px-3 py-1.5 font-medium transition ${
                  viewMode === 'week'
                    ? 'border border-[#BFDBFE] bg-[#EFF6FF] text-[#1E3A8A] shadow-[0_1px_2px_rgba(30,58,138,0.15)]'
                    : 'text-[#64748B] hover:text-[#334155]'
                }`}
                onClick={() => setViewMode('week')}
                type="button"
              >
                สัปดาห์
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-[#EEF2F7] pt-2.5">
          <p className="text-base font-semibold text-[#1E293B]">{monthLabel}</p>
          <p className="text-[11px] text-[#94A3B8]">คลิกวันที่เพื่อดูรายละเอียดงานรายวัน</p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <article className="card h-full border-[#E5EAF1] p-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-[#94A3B8]">งานนัดสำรวจทั้งหมด (เดือน)</p>
          <p className="mt-2 text-3xl font-semibold leading-none text-[#0F172A]">{summaryStats.totalTasks}</p>
        </article>
        <article className="card h-full border-[#E5EAF1] p-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-[#94A3B8]">จำนวนวันทำงานที่มีนัด</p>
          <p className="mt-2 text-3xl font-semibold leading-none text-[#0F172A]">{summaryStats.activeDays}</p>
        </article>
        <article className="card h-full border-[#E5EAF1] bg-[#FCFDFF] p-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-[#94A3B8]">วันแน่นที่สุด</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#0F172A]">
            {summaryStats.busiestDay ? (
              <>
                {formatDateKeyThai(summaryStats.busiestDay.dateKey)}
                <span className="ml-1 text-[#1E3A8A]">({summaryStats.busiestDay.total} งาน)</span>
              </>
            ) : (
              'ยังไม่มีงานนัด'
            )}
          </p>
        </article>
        <article className="card h-full border-[#E5EAF1] p-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-[#94A3B8]">จำนวนงานที่เลื่อนนัด</p>
          <p className="mt-2 text-3xl font-semibold leading-none text-[#0F172A]">{summaryStats.rescheduledCount}</p>
        </article>
        <article className="card h-full border-[#E5EAF1] bg-[#FCFDFF] p-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-[#94A3B8]">งานรวมแยกตามผู้สำรวจ</p>
          <div className="mt-2 space-y-1.5 text-sm leading-relaxed text-[#334155]">
            {summaryStats.byAssignee.slice(0, 3).map((assignee) => (
              <p key={assignee.name} className="truncate">
                <span className="text-[#64748B]">{assignee.name}:</span>{' '}
                <span className="font-semibold text-[#0F172A]">{assignee.total}</span>
              </p>
            ))}
            {summaryStats.byAssignee.length === 0 ? <p className="text-[#94A3B8]">ยังไม่มีงานนัด</p> : null}
            {summaryStats.byAssignee.length > 3 ? <p className="text-xs text-[#64748B]">+{summaryStats.byAssignee.length - 3} คน</p> : null}
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-[2.1fr,1fr]">
        <article className="card border-[#E5EAF1] p-3.5">
          <div className="grid grid-cols-7 gap-2 pb-3">
            {WEEKDAY_LABELS.map((label) => (
              <p key={label} className="text-center text-xs font-semibold tracking-wide text-[#94A3B8]">
                {label}
              </p>
            ))}
          </div>

          {viewMode === 'month' ? (
            <div className="grid grid-cols-7 gap-2.5">
              {monthCells.map((cell) => (
                <MonthCell
                  key={cell.dateKey}
                  cell={cell}
                  onSelect={setSelectedDateKey}
                  selected={selectedDateKey === cell.dateKey}
                  summary={dateMap.get(cell.dateKey) ?? null}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-7">
              {weekCells.map((cell) => (
                <MonthCell
                  key={cell.dateKey}
                  cell={cell}
                  onSelect={setSelectedDateKey}
                  selected={selectedDateKey === cell.dateKey}
                  summary={dateMap.get(cell.dateKey) ?? null}
                />
              ))}
            </div>
          )}

          {tasks.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-6 text-center text-sm text-[#64748B]">
              ยังไม่มีงานที่ลงวันนัดสำรวจในระบบ
            </div>
          ) : null}
        </article>

        <aside className="card border-[#E5EAF1] bg-[#FCFDFE] p-4">
          <div className="border-b border-[#EEF2F7] pb-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#94A3B8]">Inspector</p>
            <h3 className="mt-1 text-base font-semibold text-[#0F172A]">รายละเอียดวันที่เลือก</h3>
            <p className="mt-1 text-sm font-medium text-[#334155]">{formatDateKeyThai(selectedDateKey)}</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-2.5 py-1 text-xs font-medium text-[#1E3A8A]">
              รวม {selectedSummary?.total ?? 0} งาน
            </span>
            {selectedSummary?.byAssignee.slice(0, 2).map((assignee) => (
              <span
                key={assignee.name}
                className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-medium text-[#475569]"
              >
                {assignee.name} {assignee.total}
              </span>
            ))}
            {(selectedSummary?.byAssignee.length ?? 0) > 2 ? (
              <span className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-medium text-[#64748B]">
                +{(selectedSummary?.byAssignee.length ?? 0) - 2} คน
              </span>
            ) : null}
          </div>

          <div className="mt-4 space-y-2.5 border-t border-[#EEF2F7] pt-3">
            {selectedSummary?.tasks.map((task) => (
              <div key={task.id} className="rounded-xl border border-[#E2E8F0] bg-white p-3 text-xs leading-relaxed text-[#334155] shadow-[0_4px_12px_-12px_rgba(15,23,42,0.5)]">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[#0F172A]">{task.requestNo}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusBadgeClass(task.statusLabel)}`}>
                    {task.statusLabel}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-[12px]">
                  <p className="truncate text-[#475569]">ลูกค้า: {task.customerName}</p>
                  <p className="text-[#64748B]">ประเภท: {task.requestTypeLabel}</p>
                  <p className="text-[#64748B]">ผู้รับผิดชอบ: {task.assigneeName}</p>
                </div>
              </div>
            ))}
            {!selectedSummary ? <p className="text-sm text-[#94A3B8]">ไม่มีงานนัดสำรวจในวันนี้</p> : null}
          </div>
        </aside>
      </section>
    </div>
  );
}
