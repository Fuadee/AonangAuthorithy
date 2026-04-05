'use client';

import { useMemo, useState } from 'react';
import {
  computeAgingBuckets,
  computeBottlenecks,
  computeExecutiveKpis,
  computePerformanceByOwner,
  computeRequestViews,
  computeTrend,
  DrilldownFilter,
  EXECUTIVE_TIME_RANGE_LABELS,
  ExecutiveTimeRange,
  filterDrilldownRows,
  filterRequestsByRange,
  pickTrendBucket,
  resolveDateRange
} from '@/lib/analytics/executive-dashboard';
import { ServiceRequest } from '@/lib/requests/types';

type ExecutiveDashboardProps = {
  requests: ServiceRequest[];
};

const DRILLDOWN_TABS: Array<{ key: DrilldownFilter; label: string }> = [
  { key: 'OVERDUE', label: 'งานค้างนาน' },
  { key: 'PROBLEM', label: 'งานมีปัญหา' },
  { key: 'RESCHEDULED', label: 'งานเลื่อนนัด' },
  { key: 'RECENT', label: 'งานล่าสุด' }
];

function LineMiniChart({
  points,
  getValue,
  colorClass
}: {
  points: { label: string }[];
  getValue: (index: number) => number;
  colorClass: string;
}) {
  const values = points.map((_, index) => getValue(index));
  const max = Math.max(...values, 1);

  return (
    <div className="h-40 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex h-full items-end gap-1">
        {values.map((value, index) => (
          <div key={`${points[index].label}-${index}`} className="group flex flex-1 flex-col items-center justify-end">
            <div
              className={`w-full rounded-t-md ${colorClass}`}
              style={{ height: `${Math.max((value / max) * 100, value > 0 ? 8 : 2)}%` }}
              title={`${points[index].label}: ${value}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDateRange(from: Date, to: Date): string {
  const fromText = from.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
  const toText = to.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${fromText} - ${toText}`;
}

export function ExecutiveDashboard({ requests }: ExecutiveDashboardProps) {
  const [timeRange, setTimeRange] = useState<ExecutiveTimeRange>('30D');
  const [drilldownFilter, setDrilldownFilter] = useState<DrilldownFilter>('PROBLEM');

  const now = useMemo(() => new Date(), []);

  const computed = useMemo(() => {
    const range = resolveDateRange(timeRange, now);
    const scopedRequests = filterRequestsByRange(requests, range);
    const kpis = computeExecutiveKpis(scopedRequests, now);
    const trend = computeTrend(scopedRequests, range, pickTrendBucket(timeRange));
    const bottlenecks = computeBottlenecks(scopedRequests);
    const aging = computeAgingBuckets(scopedRequests, now);
    const requestViews = computeRequestViews(scopedRequests, kpis.avgCycleTimeDays, now);
    const performance = computePerformanceByOwner(scopedRequests, now);
    const drilldownRows = filterDrilldownRows(requestViews, drilldownFilter).slice(0, 15);

    return {
      range,
      scopedRequests,
      kpis,
      trend,
      bottlenecks,
      aging,
      requestViews,
      performance,
      drilldownRows
    };
  }, [drilldownFilter, now, requests, timeRange]);

  const busiestQueue = computed.bottlenecks[0];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">วิเคราะห์ภาพรวมงาน</h2>
            <p className="mt-1 text-sm text-slate-500">สรุปภาพรวม ติดตามปัญหา และวิเคราะห์แนวโน้มการดำเนินงาน</p>
            <p className="mt-2 text-xs text-slate-400">ช่วงข้อมูล: {formatDateRange(computed.range.from, computed.range.to)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(EXECUTIVE_TIME_RANGE_LABELS) as ExecutiveTimeRange[]).map((option) => {
              const active = option === timeRange;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTimeRange(option)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    active
                      ? 'border-[#1E3A8A] bg-[#1E3A8A] text-white shadow-sm'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {EXECUTIVE_TIME_RANGE_LABELS[option]}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {[
          { label: 'งานทั้งหมด', value: computed.kpis.total.toLocaleString('th-TH') },
          { label: 'งานเสร็จแล้ว', value: computed.kpis.completed.toLocaleString('th-TH') },
          { label: 'กำลังดำเนินการ', value: computed.kpis.inProgress.toLocaleString('th-TH') },
          { label: 'งานมีปัญหา', value: computed.kpis.problems.toLocaleString('th-TH') },
          {
            label: 'Cycle Time เฉลี่ย',
            value: computed.kpis.avgCycleTimeDays === null ? 'ยังไม่พอข้อมูล' : `${computed.kpis.avgCycleTimeDays} วัน`
          },
          { label: 'งานเลื่อนนัด', value: computed.kpis.rescheduled.toLocaleString('th-TH') }
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              if (item.label === 'งานมีปัญหา') setDrilldownFilter('PROBLEM');
              if (item.label === 'งานเลื่อนนัด') setDrilldownFilter('RESCHEDULED');
            }}
            className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:shadow"
          >
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
          </button>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">แนวโน้มปริมาณงาน (งานเข้า vs งานปิด)</h3>
            <span className="text-xs text-slate-500">{pickTrendBucket(timeRange) === 'DAY' ? 'รายวัน' : 'รายสัปดาห์'}</span>
          </div>
          {computed.trend.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">ไม่มีข้อมูลในช่วงเวลานี้</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm text-slate-600">คำร้องเข้า</p>
                <LineMiniChart points={computed.trend} getValue={(index) => computed.trend[index].incoming} colorClass="bg-blue-400" />
              </div>
              <div>
                <p className="mb-2 text-sm text-slate-600">งานปิด</p>
                <LineMiniChart points={computed.trend} getValue={(index) => computed.trend[index].completed} colorClass="bg-emerald-400" />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <h3 className="text-base font-semibold text-slate-900">Bottleneck ตามขั้นตอน</h3>
          {computed.bottlenecks.every((item) => item.count === 0) ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">ยังไม่มีงานค้างในช่วงเวลานี้</p>
          ) : (
            <div className="space-y-2">
              {computed.bottlenecks.map((item) => {
                const max = Math.max(...computed.bottlenecks.map((entry) => entry.count), 1);
                const active = busiestQueue?.queue === item.queue;
                return (
                  <button
                    type="button"
                    key={item.queue}
                    onClick={() => setDrilldownFilter('PROBLEM')}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      active ? 'border-amber-300 bg-amber-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm text-slate-700">{item.label}</span>
                      <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-slate-400" style={{ width: `${(item.count / max) * 100}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Aging งานค้างนาน</h3>
            <button
              type="button"
              onClick={() => setDrilldownFilter('OVERDUE')}
              className="text-xs font-medium text-[#1E3A8A] hover:underline"
            >
              ดูงานค้างนาน
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {computed.aging.map((bucket) => (
              <div key={bucket.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{bucket.label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{bucket.count}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">ตัวอย่างงานค้างนานที่สุด</p>
            <div className="space-y-2">
              {computed.requestViews
                .filter((item) => item.flags.isAgingCritical)
                .sort((a, b) => b.ageDays - a.ageDays)
                .slice(0, 5)
                .map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900">{item.requestNo}</span>
                      <span className="text-amber-600">ค้าง {item.ageDays} วัน</span>
                    </div>
                    <p className="text-slate-500">
                      {item.customerName} · {item.statusLabel}
                    </p>
                  </div>
                ))}
              {computed.requestViews.filter((item) => item.flags.isAgingCritical).length === 0 && (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">ยังไม่มีงานค้างนานเกินเกณฑ์</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <h3 className="text-base font-semibold text-slate-900">ประเด็นที่ควรจับตา</h3>
          <div className="space-y-2 text-sm">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-slate-600">งานเลื่อนนัด</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{computed.requestViews.filter((item) => item.flags.isRescheduled).length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-slate-600">งานตีกลับ/แก้ไขเอกสาร</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{computed.requestViews.filter((item) => item.flags.isRejected).length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-slate-600">งานเกินรอบเฉลี่ย</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {computed.requestViews.filter((item) => item.flags.isLongerThanAverage).length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-base font-semibold text-slate-900">Performance ตามผู้รับผิดชอบ</h3>
        {computed.performance.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">ไม่มีข้อมูลผู้รับผิดชอบในช่วงเวลานี้</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-2 py-2 font-medium">ผู้รับผิดชอบ</th>
                  <th className="px-2 py-2 font-medium">รับงาน</th>
                  <th className="px-2 py-2 font-medium">เสร็จ</th>
                  <th className="px-2 py-2 font-medium">ค้าง</th>
                  <th className="px-2 py-2 font-medium">เลื่อนนัด</th>
                  <th className="px-2 py-2 font-medium">เฉลี่ย (วัน)</th>
                </tr>
              </thead>
              <tbody>
                {computed.performance.map((row) => (
                  <tr key={row.owner} className="border-b border-slate-100 text-slate-700">
                    <td className="px-2 py-2 font-medium text-slate-900">{row.owner}</td>
                    <td className="px-2 py-2">{row.assigned}</td>
                    <td className="px-2 py-2">{row.completed}</td>
                    <td className="px-2 py-2">{row.pending}</td>
                    <td className="px-2 py-2">{row.rescheduled}</td>
                    <td className="px-2 py-2">{row.avgCycle ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">ตารางเจาะลึก</h3>
          <div className="flex flex-wrap gap-2">
            {DRILLDOWN_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setDrilldownFilter(tab.key)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  drilldownFilter === tab.key
                    ? 'border-[#1E3A8A] bg-[#1E3A8A] text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {computed.drilldownRows.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">ไม่มีข้อมูลที่ตรงกับตัวกรองนี้</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-2 py-2 font-medium">Request No.</th>
                  <th className="px-2 py-2 font-medium">ลูกค้า</th>
                  <th className="px-2 py-2 font-medium">ประเภท</th>
                  <th className="px-2 py-2 font-medium">ผู้รับผิดชอบ</th>
                  <th className="px-2 py-2 font-medium">สถานะ</th>
                  <th className="px-2 py-2 font-medium">อายุงาน</th>
                  <th className="px-2 py-2 font-medium">ธงปัญหา</th>
                </tr>
              </thead>
              <tbody>
                {computed.drilldownRows.map((row) => {
                  const flags = [
                    row.flags.isAgingCritical ? 'ค้างนาน' : null,
                    row.flags.isRejected ? 'ตีกลับ' : null,
                    row.flags.isRescheduled ? 'เลื่อนนัด' : null,
                    row.flags.isLongerThanAverage ? 'เกินเฉลี่ย' : null
                  ].filter(Boolean);

                  return (
                    <tr key={row.id} className="border-b border-slate-100 text-slate-700">
                      <td className="px-2 py-2 font-medium text-slate-900">{row.requestNo}</td>
                      <td className="px-2 py-2">{row.customerName}</td>
                      <td className="px-2 py-2">{row.requestType}</td>
                      <td className="px-2 py-2">{row.assigneeName}</td>
                      <td className="px-2 py-2">{row.statusLabel}</td>
                      <td className="px-2 py-2">{row.ageDays} วัน</td>
                      <td className="px-2 py-2">{flags.length ? flags.join(' · ') : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
