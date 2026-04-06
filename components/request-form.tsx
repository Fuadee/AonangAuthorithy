'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createRequestAction } from '@/app/actions';
import { Area, Assignee, REQUEST_TYPE_LABELS, REQUEST_TYPES } from '@/lib/requests/types';
import { resolveAreaLabelFromCode } from '@/lib/requests/areas';
import { getResponsibleSurveyorIdByAreaCode } from '@/lib/requests/area-responsible';
import { getSurveyorDisplayName } from '@/lib/requests/surveyor-display';
import type { SurveySuggestionResult } from '@/lib/requests/survey-suggestion';
import { getFixedSurveyScheduleByAreaCode } from '@/lib/requests/fixed-survey-schedule';
import { RequestLocationPicker } from '@/components/request-location-picker';

type RequestFormProps = {
  areas: Area[];
  assignees: Assignee[];
};

type CanonicalSurveyorOption = {
  id: string;
  code: string;
  name: string;
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
  const [selectedSurveyorId, setSelectedSurveyorId] = useState('');
  const [selectedSurveyDate, setSelectedSurveyDate] = useState('');
  const [surveySuggestion, setSurveySuggestion] = useState<SurveySuggestionResult | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [surveyorSelectionStatus, setSurveyorSelectionStatus] = useState<'manual' | 'recommended'>('manual');
  const [surveyDateSelectionStatus, setSurveyDateSelectionStatus] = useState<'manual' | 'recommended'>('manual');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lastAutoAppliedRecommendationKey, setLastAutoAppliedRecommendationKey] = useState('');

  const selectedArea = useMemo(() => areas.find((area) => area.code === areaCode), [areas, areaCode]);
  const surveyorOptions = useMemo<CanonicalSurveyorOption[]>(
    () =>
      assignees
        .map((assignee) => ({
          id: assignee.id,
          code: assignee.code?.trim() ?? '',
          name: assignee.name?.trim() ?? ''
        }))
        .filter((option) => option.id && option.name),
    [assignees]
  );
  const surveyorsById = useMemo(
    () => new Map(surveyorOptions.map((surveyor) => [surveyor.id, surveyor])),
    [surveyorOptions]
  );
  const surveyorsByCode = useMemo(
    () => new Map(surveyorOptions.map((surveyor) => [surveyor.code.toLowerCase(), surveyor])),
    [surveyorOptions]
  );
  const responsibleSurveyorId = useMemo(() => getResponsibleSurveyorIdByAreaCode(areaCode) ?? '', [areaCode]);
  const mappedResponsibleName = surveyorsById.get(responsibleSurveyorId)?.name ?? '-';
  const selectedSurveyor = useMemo(
    () => surveyorsById.get(selectedSurveyorId),
    [selectedSurveyorId, surveyorsById]
  );
  const selectedSurveyorName = selectedSurveyor?.name ?? '';
  const areaFixedSchedule = useMemo(() => getFixedSurveyScheduleByAreaCode(areaCode), [areaCode]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSuggestion() {
      if (!areaCode) {
        setSurveySuggestion(null);
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

  const recommendation = useMemo(() => {
    const recommendedSurveyorId =
      surveySuggestion?.suggestion?.surveyor_id ??
      areaFixedSchedule?.surveyorId ??
      resolveSurveyorOptionValue({
        recommendationSurveyor: surveySuggestion?.suggestion?.surveyor_name ?? surveySuggestion?.suggestion?.surveyor ?? '',
        surveyorsById,
        surveyorsByCode,
        surveyorOptions
      });
    const recommendedSurveyorName =
      surveyorsById.get(recommendedSurveyorId)?.name ??
      surveySuggestion?.suggestion?.surveyor_name ??
      areaFixedSchedule?.surveyorName ??
      '-';

    return {
      recommendedSurveyorId,
      recommendedSurveyorName,
      recommendedSurveyDateIso: normalizeDateInputValue(surveySuggestion?.suggestion?.suggested_date ?? '')
    };
  }, [
    areaFixedSchedule?.surveyorId,
    areaFixedSchedule?.surveyorName,
    surveySuggestion?.suggestion?.surveyor,
    surveySuggestion?.suggestion?.surveyor_id,
    surveySuggestion?.suggestion?.surveyor_name,
    surveySuggestion?.suggestion?.suggested_date,
    surveyorOptions,
    surveyorsByCode,
    surveyorsById
  ]);

  const isRecommendedSurveyorSelected =
    !!selectedSurveyorId &&
    !!recommendation.recommendedSurveyorId &&
    selectedSurveyorId === recommendation.recommendedSurveyorId &&
    surveyorSelectionStatus === 'recommended';
  const isRecommendedSurveyDateSelected =
    !!selectedSurveyDate &&
    !!recommendation.recommendedSurveyDateIso &&
    selectedSurveyDate === recommendation.recommendedSurveyDateIso &&
    surveyDateSelectionStatus === 'recommended';
  const isAreaResponsibleMismatch =
    !!selectedSurveyorId &&
    !!recommendation.recommendedSurveyorId &&
    selectedSurveyorId !== recommendation.recommendedSurveyorId;

  const recommendedDateText = surveySuggestion?.suggestion?.suggested_date
    ? new Date(`${surveySuggestion.suggestion.suggested_date}T00:00:00`).toLocaleDateString('th-TH', {
        dateStyle: 'full'
      })
    : '-';

  useEffect(() => {
    if (!areaCode || isLoadingSuggestion) {
      return;
    }

    if (!recommendation.recommendedSurveyorId || !recommendation.recommendedSurveyDateIso) {
      return;
    }

    const autoApplyKey = `${areaCode}:${recommendation.recommendedSurveyorId}:${recommendation.recommendedSurveyDateIso}`;
    if (autoApplyKey === lastAutoAppliedRecommendationKey) {
      return;
    }

    setSelectedSurveyorId(recommendation.recommendedSurveyorId);
    setSelectedSurveyDate(recommendation.recommendedSurveyDateIso);
    setSurveyorSelectionStatus('recommended');
    setSurveyDateSelectionStatus('recommended');
    setLastAutoAppliedRecommendationKey(autoApplyKey);
  }, [
    areaCode,
    isLoadingSuggestion,
    lastAutoAppliedRecommendationKey,
    recommendation.recommendedSurveyDateIso,
    recommendation.recommendedSurveyorId
  ]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    console.info('[request-form] render debug', {
      areaCode,
      assigneesFromRoute: assignees.map((assignee) => ({ id: assignee.id, code: assignee.code, name: assignee.name })),
      surveyorOptions,
      recommendation,
      selectedSurveyorId,
      selectedSurveyDate
    });
  }, [areaCode, assignees, recommendation, selectedSurveyDate, selectedSurveyorId, surveyorOptions]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!location) {
      event.preventDefault();
      setLocationError('กรุณาปักหมุดตำแหน่งก่อนบันทึกคำร้อง');
      return;
    }

    setLocationError(null);
  }

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
                {recommendation.recommendedSurveyorName}
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
            value={selectedSurveyorId}
            onChange={(event) => {
              setSelectedSurveyorId(event.target.value);
              setSurveyorSelectionStatus('manual');
            }}
          >
            <option value="">-- เลือกผู้สำรวจ --</option>
            {surveyorOptions.map((surveyor) => (
              <option key={surveyor.id} value={surveyor.id}>
                {surveyor.name}
              </option>
            ))}
          </select>
          <input id="assigned_surveyor" name="assigned_surveyor" type="hidden" value={selectedSurveyorName} readOnly />
          {selectedSurveyorId ? (
            <p className="mt-1 text-xs text-slate-500">
              {isRecommendedSurveyorSelected
                ? 'สถานะ: ตามคำแนะนำของระบบ'
                : isAreaResponsibleMismatch
                  ? 'สถานะ: ผู้แทนงาน'
                  : 'สถานะ: เลือกผู้สำรวจเอง'}
            </p>
          ) : null}
          {isAreaResponsibleMismatch ? (
            <p className="mt-1 text-xs text-amber-600">
              ผู้สำรวจที่เลือกเป็นผู้แทนงานใน slot ของพื้นที่นี้
            </p>
          ) : null}
          {!isAreaResponsibleMismatch && !!selectedSurveyorName ? (
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
            required
            value={selectedSurveyDate}
            onChange={(event) => {
              setSelectedSurveyDate(event.target.value);
              setSurveyDateSelectionStatus('manual');
            }}
          />
          <p className="mt-1 text-xs text-slate-500">
            ระบบแนะนำวันสำรวจตามรอบพื้นที่ แต่สามารถเปลี่ยนวันได้ตามการนัดหมายจริง
          </p>
          {selectedSurveyDate && recommendation.recommendedSurveyDateIso ? (
            <p className="mt-1 text-xs text-slate-500">
              {isRecommendedSurveyDateSelected ? 'สถานะวันสำรวจ: ตามคำแนะนำของระบบ' : 'สถานะวันสำรวจ: เลือกวันเอง'}
            </p>
          ) : null}
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

function normalizeDateInputValue(rawDate: string): string {
  const trimmedDate = rawDate.trim();
  if (!trimmedDate) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
    return trimmedDate;
  }

  const parsedDate = new Date(trimmedDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return parsedDate.toISOString().slice(0, 10);
}

function resolveSurveyorOptionValue({
  recommendationSurveyor,
  surveyorsById,
  surveyorsByCode,
  surveyorOptions
}: {
  recommendationSurveyor: string;
  surveyorsById: Map<string, CanonicalSurveyorOption>;
  surveyorsByCode: Map<string, CanonicalSurveyorOption>;
  surveyorOptions: CanonicalSurveyorOption[];
}): string {
  const normalizedRecommendation = recommendationSurveyor.trim();
  if (!normalizedRecommendation) {
    return '';
  }

  const byId = surveyorsById.get(normalizedRecommendation);
  if (byId) {
    return byId.id;
  }

  const byCode = surveyorsByCode.get(normalizedRecommendation.toLowerCase());
  if (byCode) {
    return byCode.id;
  }

  const byName = surveyorOptions.find((surveyor) => surveyor.name === normalizedRecommendation);
  return byName?.id ?? '';
}
