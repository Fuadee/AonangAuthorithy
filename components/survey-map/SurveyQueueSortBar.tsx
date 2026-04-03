'use client';

import type { SortMode, SurveyQueueRequest } from '@/components/survey-map/types';

type SurveyQueueSortBarProps = {
  sortMode: SortMode;
  onChangeSort: (mode: SortMode) => void;
  planningStartId: string | null;
  onChangePlanningStart: (id: string | null) => void;
  referenceDescription: string;
  requests: SurveyQueueRequest[];
};

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: 'NEAREST_FROM_MAP_CENTER', label: 'ใกล้สุด (อิงจุดอ้างอิง)' },
  { value: 'FARTHEST_FROM_MAP_CENTER', label: 'ไกลสุด (อิงจุดอ้างอิง)' },
  { value: 'OLDEST_CREATED', label: 'สร้างเก่าสุด' },
  { value: 'NEWEST_CREATED', label: 'สร้างใหม่สุด' },
  { value: 'LATEST_SURVEY_DATE', label: 'วันนัดสำรวจล่าสุด' },
  { value: 'REQUEST_NO', label: 'Request No.' }
];

export function SurveyQueueSortBar({
  sortMode,
  onChangeSort,
  planningStartId,
  onChangePlanningStart,
  referenceDescription,
  requests
}: SurveyQueueSortBarProps) {
  return (
    <section className="card space-y-3 p-4">
      <div>
        <p className="text-sm font-medium text-slate-700">เรียงลำดับงาน</p>
        <p className="text-xs text-slate-500">การเรียงใกล้/ไกล อิงจาก: {referenceDescription}</p>
      </div>

      <select
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        value={sortMode}
        onChange={(event) => onChangeSort(event.target.value as SortMode)}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-700">Quick planning</p>
        <p className="text-xs text-slate-500">เลือกงานเริ่มต้นเพื่อใช้เป็นจุดอ้างอิงในการเรียงระยะ</p>
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={planningStartId ?? ''}
          onChange={(event) => onChangePlanningStart(event.target.value || null)}
        >
          <option value="">ไม่ระบุจุดเริ่ม (ใช้ศูนย์กลางแผนที่)</option>
          {requests.map((request) => (
            <option key={request.id} value={request.id}>
              {request.request_no} - {request.customer_name}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
