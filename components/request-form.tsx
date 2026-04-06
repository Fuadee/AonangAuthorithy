'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createRequestAction } from '@/app/actions';
import { Area, Assignee, REQUEST_TYPE_LABELS, REQUEST_TYPES } from '@/lib/requests/types';
import { resolveAreaLabelFromCode } from '@/lib/requests/areas';
import { getResponsibleByAreaCode } from '@/lib/requests/area-responsible';
import type { SurveySuggestionResult } from '@/lib/requests/survey-suggestion';
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

  const selectedArea = useMemo(() => areas.find((area) => area.code === areaCode), [areas, areaCode]);
  const mappedResponsibleName = useMemo(() => getResponsibleByAreaCode(areaCode), [areaCode]);
  const filteredAssignees = useMemo(() => {
    if (!mappedResponsibleName) {
      return assignees;
    }

    const mapped = assignees.filter((assignee) => assignee.name === mappedResponsibleName);
    return mapped.length > 0 ? mapped : assignees;
  }, [assignees, mappedResponsibleName]);
  const selectedSurveyor = useMemo(
    () => assignees.find((assignee) => assignee.id === assignedSurveyorId),
    [assignees, assignedSurveyorId]
  );

  useEffect(() => {
    setAssignedSurveyor(selectedSurveyor?.name ?? '');
  }, [selectedSurveyor]);

  useEffect(() => {
    if (!mappedResponsibleName) {
      return;
    }

    const mappedAssignee = assignees.find((assignee) => assignee.name === mappedResponsibleName);
    if (!mappedAssignee) {
      return;
    }

    setAssignedSurveyorId(mappedAssignee.id);
    setAssignedSurveyor(mappedAssignee.name);
  }, [assignees, mappedResponsibleName]);

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!location) {
      event.preventDefault();
      setLocationError('กรุณาปักหมุดตำแหน่งก่อนบันทึกคำร้อง');
      return;
    }

    setLocationError(null);
  }

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
                .map((schedule) => `${schedule.surveyor_name} (${WEEKDAY_LABELS[schedule.weekday] ?? schedule.weekday})`)
                .join(', ')}
            </p>

            <div className="mt-3 space-y-1 text-sm">
              <p>
                <span className="text-slate-500">ผู้สำรวจที่แนะนำ:</span>{' '}
                {surveySuggestion.suggestion?.surveyor ?? '-'}
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
            {filteredAssignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.code} | {assignee.name}
              </option>
            ))}
          </select>
          <input id="assigned_surveyor" name="assigned_surveyor" type="hidden" value={assignedSurveyor} readOnly />
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
            onChange={(event) => setScheduledSurveyDate(event.target.value)}
          />
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
