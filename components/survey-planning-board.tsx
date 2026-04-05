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
      return 'border-[#93C5FD] bg-[#EFF6FF]';
    case 'medium':
      return 'border-[#BFDBFE] bg-[#F8FAFF]';
    case 'low':
      return 'border-[#DBEAFE] bg-[#FCFDFF]';
    case 'none':
    default:
      return 'border-[#E2E8F0] bg-white';
  }
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
  const totalLabel = summary ? `${summary.total} งาน` : 'ไม่มีงาน';

  return (
    <button
      className={`h-32 rounded-xl border p-2 text-left transition ${getDensityClass(summary?.density ?? 'none')} ${selected ? 'ring-2 ring-[#1E3A8A]/35' : 'hover:border-[#93C5FD]'}`}
      onClick={() => onSelect(cell.dateKey)}
      type="button"
    >
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${cell.inCurrentMonth ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>
          {cell.date.getUTCDate()}
        </span>
        <span className="text-[11px] font-medium text-[#475569]">{totalLabel}</span>
      </div>

      <div className="mt-2 space-y-1">
        {summary?.byAssignee.slice(0, 2).map((assignee) => (
          <p key={assignee.name} className="truncate text-[11px] text-[#334155]">
            {assignee.shortName}: {assignee.total}
          </p>
        ))}

        {summary && summary.byAssignee.length > 2 ? (
          <p className="text-[11px] text-[#64748B]">+{summary.byAssignee.length - 2} คน</p>
        ) : null}
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
    <div className="space-y-4">
      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#0F172A]">แผนงานสำรวจรายเดือน</h2>
            <p className="text-sm text-[#64748B]">ภาพรวมงานนัดสำรวจของทีม พร้อมตรวจสอบภาระงานรายวัน</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-secondary" onClick={goToPrevious} type="button">
              เดือนก่อนหน้า
            </button>
            <button className="btn-secondary" onClick={goToToday} type="button">
              วันนี้
            </button>
            <button className="btn-secondary" onClick={goToNext} type="button">
              เดือนถัดไป
            </button>
            <div className="ml-2 inline-flex rounded-lg border border-[#CBD5E1] p-1 text-sm">
              <button
                className={`rounded-md px-3 py-1 ${viewMode === 'month' ? 'bg-[#1E3A8A] text-white' : 'text-[#475569]'}`}
                onClick={() => setViewMode('month')}
                type="button"
              >
                เดือน
              </button>
              <button
                className={`rounded-md px-3 py-1 ${viewMode === 'week' ? 'bg-[#1E3A8A] text-white' : 'text-[#475569]'}`}
                onClick={() => setViewMode('week')}
                type="button"
              >
                สัปดาห์
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-[#E2E8F0] pt-3">
          <p className="text-sm font-medium text-[#334155]">{monthLabel}</p>
          <p className="text-xs text-[#64748B]">คลิกวันที่เพื่อดูรายละเอียดงานรายวัน</p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <article className="card p-3">
          <p className="text-xs text-[#64748B]">งานนัดสำรวจทั้งหมด (เดือน)</p>
          <p className="mt-1 text-2xl font-semibold text-[#0F172A]">{summaryStats.totalTasks}</p>
        </article>
        <article className="card p-3">
          <p className="text-xs text-[#64748B]">จำนวนวันทำงานที่มีนัด</p>
          <p className="mt-1 text-2xl font-semibold text-[#0F172A]">{summaryStats.activeDays}</p>
        </article>
        <article className="card p-3">
          <p className="text-xs text-[#64748B]">วันแน่นที่สุด</p>
          <p className="mt-1 text-sm font-semibold text-[#0F172A]">
            {summaryStats.busiestDay ? `${formatDateKeyThai(summaryStats.busiestDay.dateKey)} (${summaryStats.busiestDay.total} งาน)` : 'ยังไม่มีงานนัด'}
          </p>
        </article>
        <article className="card p-3">
          <p className="text-xs text-[#64748B]">จำนวนงานที่เลื่อนนัด</p>
          <p className="mt-1 text-2xl font-semibold text-[#0F172A]">{summaryStats.rescheduledCount}</p>
        </article>
        <article className="card p-3">
          <p className="text-xs text-[#64748B]">งานรวมแยกตามผู้สำรวจ</p>
          <div className="mt-1 space-y-1 text-sm text-[#334155]">
            {summaryStats.byAssignee.slice(0, 3).map((assignee) => (
              <p key={assignee.name} className="truncate">
                {assignee.name}: {assignee.total}
              </p>
            ))}
            {summaryStats.byAssignee.length === 0 ? <p className="text-[#94A3B8]">ยังไม่มีงานนัด</p> : null}
            {summaryStats.byAssignee.length > 3 ? <p className="text-xs text-[#64748B]">+{summaryStats.byAssignee.length - 3} คน</p> : null}
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-[2.1fr,1fr]">
        <article className="card p-3">
          <div className="grid grid-cols-7 gap-2 pb-2">
            {WEEKDAY_LABELS.map((label) => (
              <p key={label} className="text-center text-xs font-semibold text-[#64748B]">
                {label}
              </p>
            ))}
          </div>

          {viewMode === 'month' ? (
            <div className="grid grid-cols-7 gap-2">
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
            <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
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

        <aside className="card p-4">
          <h3 className="text-base font-semibold text-[#0F172A]">รายละเอียดวันที่เลือก</h3>
          <p className="mt-1 text-sm text-[#475569]">{formatDateKeyThai(selectedDateKey)}</p>
          <p className="mt-3 text-sm text-[#334155]">รวม {selectedSummary?.total ?? 0} งาน</p>

          <div className="mt-3 space-y-1 text-sm">
            {selectedSummary?.byAssignee.map((assignee) => (
              <p key={assignee.name} className="text-[#334155]">
                {assignee.name}: {assignee.total}
              </p>
            ))}
            {!selectedSummary ? <p className="text-[#94A3B8]">ไม่มีงานนัดสำรวจในวันนี้</p> : null}
          </div>

          <div className="mt-4 space-y-2 border-t border-[#E2E8F0] pt-3">
            {selectedSummary?.tasks.map((task) => (
              <div key={task.id} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs text-[#334155]">
                <p className="font-semibold text-[#0F172A]">{task.requestNo}</p>
                <p className="truncate">ลูกค้า: {task.customerName}</p>
                <p>ประเภท: {task.requestTypeLabel}</p>
                <p>ผู้รับผิดชอบ: {task.assigneeName}</p>
                <p>สถานะ: {task.statusLabel}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
