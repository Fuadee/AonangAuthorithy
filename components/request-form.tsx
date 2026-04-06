'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createRequestAction } from '@/app/actions';
import { Area, Assignee, REQUEST_TYPE_LABELS, REQUEST_TYPES } from '@/lib/requests/types';
import { resolveAreaLabelFromCode } from '@/lib/requests/areas';
import { getResponsibleByAreaCode } from '@/lib/requests/area-responsible';
import { getSurveyorDisplayName, getSurveyorDisplayNameFromAssignee } from '@/lib/requests/surveyor-display';
import type { SurveySuggestionResult } from '@/lib/requests/survey-suggestion';
import {
  getAllowedWeekdaysForArea,
  getAllowedWeekdaysForSurveyor,
  getFixedSurveyScheduleByAreaCode,
  isDateAllowedForArea
} from '@/lib/requests/fixed-survey-schedule';
import { RequestLocationPicker } from '@/components/request-location-picker';

type RequestFormProps = {
  areas: Area[];
  assignees: Assignee[];
};

const WEEKDAY_LABELS: Record<string, string> = {
  Monday: 'จันทร์',
  Tuesday: 'อังคาร',
  Wednesday: 'พุธ',
  Thursday: 'พฤหัสบดี',
  Friday: 'ศุกร์',
  Saturday: 'เสาร์',
  Sunday: 'อาทิตย์'
};

export function RequestForm({ areas, assignees }: RequestFormProps) {
  const [requestType, setRequestType] = useState('');
  const [areaCode, setAreaCode] = useState('');
  const [assignedSurveyorId, setAssignedSurveyorId] = useState('');
  const [assignedSurveyor, setAssignedSurveyor] = useState('');
  const [scheduledSurveyDate, setScheduledSurveyDate] = useState('');
  const [surveySuggestion, setSurveySuggestion] = useState<SurveySuggestionResult | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [scheduleDateError, setScheduleDateError] = useState<string | null>(null);

  const selectedArea = useMemo(() => areas.find((area) => area.code === areaCode), [areas, areaCode]);
  const mappedResponsibleName = useMemo(() => getResponsibleByAreaCode(areaCode), [areaCode]);
  const selectedSurveyor = useMemo(
    () => assignees.find((assignee) => assignee.id === assignedSurveyorId),
    [assignees, assignedSurveyorId]
  );
  const areaFixedSchedule = useMemo(() => getFixedSurveyScheduleByAreaCode(areaCode), [areaCode]);
  const selectedSurveyorName = selectedSurveyor?.name ?? '';

  useEffect(() => {
    setAssignedSurveyor(selectedSurveyor?.name ?? '');
  }, [selectedSurveyor]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSuggestion() {
      if (!areaCode) {
        setSurveySuggestion(null);
        setAssignedSurveyor('');
        setScheduledSurveyDate('');
        return;
      }

      setIsLoadingSuggestion(true);
      try {
        const response = await fetch(`/api/survey-suggestion?area_code=${areaCode}`, {
          method: 'GET',
          signal: controller.signal
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? 'ไม่สามารถโหลดคำแนะนำคิวสำรวจได้');
        }

        const data = (await response.json()) as SurveySuggestionResult;
        setSurveySuggestion(data);
      } catch {
        setSurveySuggestion({
          area_code: areaCode,
          schedules: [],
          suggestion: null,
          message: 'ไม่สามารถโหลดคำแนะนำคิวสำรวจได้ กรุณาลองใหม่อีกครั้ง'
        });
      } finally {
        setIsLoadingSuggestion(false);
      }
    }

    loadSuggestion();

    return () => controller.abort();
  }, [areaCode]);

  useEffect(() => {
    if (!scheduledSurveyDate || !areaCode) {
      setScheduleDateError(null);
      return;
    }

    if (!isDateAllowedForArea(areaCode, scheduledSurveyDate)) {
      const weekdayLabels = getAllowedWeekdaysForArea(areaCode)
        .map((weekday) => WEEKDAY_LABELS[weekday] ?? weekday)
        .join(', ');
      setScheduleDateError(`วันสำรวจของพื้นที่นี้เลือกได้เฉพาะวัน ${weekdayLabels || '-'} เท่านั้น`);
      return;
    }

    setScheduleDateError(null);
  }, [areaCode, scheduledSurveyDate]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (scheduledSurveyDate && areaCode && !isDateAllowedForArea(areaCode, scheduledSurveyDate)) {
      event.preventDefault();
      setScheduleDateError('วันสำรวจต้องเป็นวันตามตารางของพื้นที่ที่เลือก');
      return;
    }

    if (!location) {
      event.preventDefault();
      setLocationError('กรุณาปักหมุดตำแหน่งก่อนบันทึกคำร้อง');
      return;
    }

    setLocationError(null);
  }

  const allowedWeekdayLabels = getAllowedWeekdaysForSurveyor(selectedSurveyorName)
    .map((weekday) => WEEKDAY_LABELS[weekday] ?? weekday)
    .join(', ');
  const areaAllowedWeekdayLabels = getAllowedWeekdaysForArea(areaCode)
    .map((weekday) => WEEKDAY_LABELS[weekday] ?? weekday)
    .join(', ');
  const recommendedSurveyorName = areaFixedSchedule?.surveyorName ?? surveySuggestion?.suggestion?.surveyor ?? '';
  const isRecommendedSurveyorSelected =
    !!selectedSurveyorName &&
    !!recommendedSurveyorName &&
    selectedSurveyorName === recommendedSurveyorName;
  const isAreaResponsibleMismatch =
    !!selectedSurveyorName && !!recommendedSurveyorName && selectedSurveyorName !== recommendedSurveyorName;

  const minScheduledDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  }, []);

  const recommendedDateText = surveySuggestion?.suggestion?.suggested_date
    ? new Date(`${surveySuggestion.suggestion.suggested_date}T00:00:00`).toLocaleDateString('th-TH', {
        dateStyle: 'full'
      })
    : '-';

  return (
    <form action={createRequestAction} className="card space-y-5 p-6" onSubmit={handleSubmit}>
      <div>
        <label className="text-sm font-medium" htmlFor="request_type">
          ประเภทคำร้อง
        </label>
        <select
          className="input"
          id="request_type"
          name="request_type"
          required
          value={requestType}
          onChange={(event) => setRequestType(event.target.value)}
        >
          <option value="">-- เลือกประเภทคำร้อง --</option>
          {REQUEST_TYPES.map((type) => (
            <option key={type} value={type}>
              {REQUEST_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="customer_name">
          ชื่อลูกค้า
        </label>
        <input className="input" id="customer_name" name="customer_name" required />
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="phone">
          เบอร์โทรศัพท์
        </label>
        <input className="input" id="phone" name="phone" required />
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="area_code">
          พื้นที่
        </label>
        <select
          className="input"
          id="area_code"
          name="area_code"
          required
          value={areaCode}
          onChange={(event) => setAreaCode(event.target.value)}
        >
          <option value="">-- เลือกพื้นที่ --</option>
          {areas.map((area) => (
            <option key={area.id} value={area.code}>
              {resolveAreaLabelFromCode(area.code)}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          {selectedArea ? `พื้นที่ที่เลือก: ${resolveAreaLabelFromCode(selectedArea.code)}` : 'ยังไม่เลือกพื้นที่'}
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-700">วันนัดสำรวจถัดไปที่แนะนำ</h3>
        {isLoadingSuggestion && <p className="mt-2 text-xs text-slate-500">กำลังคำนวณคิวสำรวจ...</p>}

        {!isLoadingSuggestion && surveySuggestion?.schedules.length ? (
          <>
            <p className="mt-2 text-xs text-slate-500">
              ตารางประจำ:{' '}
              {surveySuggestion.schedules
                .map((schedule) => `${getSurveyorDisplayName(schedule.surveyor_name)} (${WEEKDAY_LABELS[schedule.weekday] ?? schedule.weekday})`)
                .join(', ')}
            </p>

            <div className="mt-3 space-y-1 text-sm">
              <p>
                <span className="text-slate-500">ผู้สำรวจที่แนะนำ:</span>{' '}
                {getSurveyorDisplayName(surveySuggestion.suggestion?.surveyor)}
                {surveySuggestion.suggestion?.surveyor ? (
                  <span className="ml-2 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {isRecommendedSurveyorSelected ? 'ตามคำแนะนำ' : 'คำแนะนำของระบบ'}
                  </span>
                ) : null}
              </p>
              <p>
                <span className="text-slate-500">วันนัดสำรวจถัดไปที่แนะนำ:</span> {recommendedDateText}
              </p>
              <p>
                <span className="text-slate-500">คิวของวันนั้น:</span>{' '}
                {surveySuggestion.suggestion
                  ? `${surveySuggestion.suggestion.current_jobs}/${surveySuggestion.suggestion.max_jobs_per_day}`
                  : '-'}
              </p>
            </div>

            {surveySuggestion.suggestion && (
              <button
                className="btn-secondary mt-3"
                type="button"
                onClick={() => {
                  const suggestedSurveyorName = surveySuggestion.suggestion?.surveyor ?? '';
                  const matchedSurveyor = assignees.find((assignee) => assignee.name === suggestedSurveyorName);
                  setAssignedSurveyorId(matchedSurveyor?.id ?? '');
                  setScheduledSurveyDate(surveySuggestion.suggestion?.suggested_date ?? '');
                }}
              >
                ใช้คำแนะนำ
              </button>
            )}
          </>
        ) : null}

        {!isLoadingSuggestion && surveySuggestion?.message ? (
          <p className="mt-2 text-sm text-amber-600">{surveySuggestion.message}</p>
        ) : null}

        {!isLoadingSuggestion && !areaCode ? (
          <p className="mt-2 text-xs text-slate-500">กรุณาเลือกพื้นที่เพื่อดูวันนัดสำรวจถัดไปที่แนะนำ</p>
        ) : null}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium" htmlFor="assigned_surveyor_id">
            ผู้สำรวจ
          </label>
          <select
            className="input"
            id="assigned_surveyor_id"
            name="assigned_surveyor_id"
            required
            value={assignedSurveyorId}
            onChange={(event) => setAssignedSurveyorId(event.target.value)}
          >
            <option value="">-- เลือกผู้สำรวจ --</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {getSurveyorDisplayNameFromAssignee(assignee)}
              </option>
            ))}
          </select>
          <input id="assigned_surveyor" name="assigned_surveyor" type="hidden" value={assignedSurveyor} readOnly />
          {assignedSurveyorId ? (
            <p className="mt-1 text-xs text-slate-500">
              {isRecommendedSurveyorSelected ? 'สถานะ: ตามคำแนะนำของระบบ' : 'สถานะ: ผู้แทนงาน'}
            </p>
          ) : null}
          {isAreaResponsibleMismatch ? (
            <p className="mt-1 text-xs text-amber-600">
              ผู้สำรวจที่เลือกเป็นผู้แทนงานใน slot ของพื้นที่นี้
            </p>
          ) : null}
          {!isAreaResponsibleMismatch && !!selectedSurveyorName && !!mappedResponsibleName ? (
            <p className="mt-1 text-xs text-slate-500">ผู้รับผิดชอบประจำพื้นที่: {mappedResponsibleName}</p>
          ) : null}
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="scheduled_survey_date">
            วันสำรวจ
          </label>
          <input
            className="input"
            id="scheduled_survey_date"
            name="scheduled_survey_date"
            type="date"
            value={scheduledSurveyDate}
            min={minScheduledDate}
            onChange={(event) => {
              const nextDate = event.target.value;
              if (!nextDate) {
                setScheduledSurveyDate('');
                setScheduleDateError(null);
                return;
              }

              if (areaCode && !isDateAllowedForArea(areaCode, nextDate)) {
                setScheduledSurveyDate('');
                setScheduleDateError(`วันสำรวจของพื้นที่นี้เลือกได้เฉพาะวัน ${areaAllowedWeekdayLabels || '-'} เท่านั้น`);
                return;
              }

              setScheduleDateError(null);
              setScheduledSurveyDate(nextDate);
            }}
          />
          {areaAllowedWeekdayLabels ? (
            <p className="mt-1 text-xs text-slate-500">วันสำรวจอิงตามตารางของพื้นที่ (เลือกได้: {areaAllowedWeekdayLabels})</p>
          ) : null}
          {!areaAllowedWeekdayLabels && allowedWeekdayLabels ? (
            <p className="mt-1 text-xs text-slate-500">วันสำรวจอิงตามตารางของพื้นที่</p>
          ) : null}
          {scheduleDateError ? <p className="mt-1 text-xs text-rose-600">{scheduleDateError}</p> : null}
        </div>
      </div>

      <RequestLocationPicker
        onLocationChange={(nextLocation) => {
          setLocation(nextLocation);
          if (nextLocation) {
            setLocationError(null);
          }
        }}
        submitError={locationError}
      />

      <button className="btn-primary w-full" type="submit">
        บันทึกคำร้อง
      </button>
    </form>
  );
}
