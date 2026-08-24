'use client';

import { FormEvent, useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { createRequestAction } from '@/app/actions';
import { formatDateOnly, isFutureBangkokDate } from '@/lib/datetime';
import { Area, Assignee } from '@/lib/requests/types';
import { resolveAreaLabelFromCode } from '@/lib/requests/areas';
import { getResponsibleSurveyorIdByAreaCode } from '@/lib/requests/area-responsible';
import { getSurveyorDisplayName } from '@/lib/requests/surveyor-display';
import type { SurveySuggestionResult } from '@/lib/requests/survey-suggestion';
import { getFixedSurveyScheduleByAreaCode } from '@/lib/requests/fixed-survey-schedule';
import { RequestLocationPicker } from '@/components/request-location-picker';
import {
  METER_SIZE_LABELS,
  MeterSize,
  PHASE_LABELS,
  PHASE_TYPES,
  PhaseType,
  REQUEST_INTENT_LABELS,
  REQUEST_INTENTS,
  RequestIntent,
  resolveRequestSubmission
} from '@/lib/requests/request-intent';

type RequestFormProps = {
  areas: Area[];
  assignees: Assignee[];
  submissionId: string;
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

export function RequestForm({ areas, assignees, submissionId }: RequestFormProps) {
  const [createState, createFormAction, isCreatePending] = useActionState(createRequestAction, {
    error: null
  });
  const submitLockRef = useRef(false);
  const [isSubmitLocked, setIsSubmitLocked] = useState(false);
  const [intent, setIntent] = useState<RequestIntent | ''>('');
  const [meterSize, setMeterSize] = useState<MeterSize | ''>('');
  const [phase, setPhase] = useState<PhaseType | ''>('');
  const [intentError, setIntentError] = useState<string | null>(null);
  const [meterSizeError, setMeterSizeError] = useState<string | null>(null);
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const [areaCode, setAreaCode] = useState('');
  const [selectedSurveyorId, setSelectedSurveyorId] = useState('');
  const [selectedSurveyDate, setSelectedSurveyDate] = useState('');
  const [surveySuggestion, setSurveySuggestion] = useState<SurveySuggestionResult | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [surveyorSelectionStatus, setSurveyorSelectionStatus] = useState<'manual' | 'recommended'>('manual');
  const [surveyDateSelectionStatus, setSurveyDateSelectionStatus] = useState<'manual' | 'recommended'>('manual');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [flexibleAddressError, setFlexibleAddressError] = useState<string | null>(null);
  const [houseNumber, setHouseNumber] = useState('');
  const [villageNo, setVillageNo] = useState('');
  const [road, setRoad] = useState('');
  const [landmark, setLandmark] = useState('');
  const [surveyDateError, setSurveyDateError] = useState<string | null>(null);
  const [lastAutoAppliedRecommendationKey, setLastAutoAppliedRecommendationKey] = useState('');

  useEffect(() => {
    if (!isCreatePending && createState.error) {
      submitLockRef.current = false;
      setIsSubmitLocked(false);
    }
  }, [createState.error, isCreatePending]);

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
  const responsibleSurveyorId = useMemo(() => {
    const responsibleSurveyorCode = getResponsibleSurveyorIdByAreaCode(areaCode);
    if (!responsibleSurveyorCode) {
      return '';
    }

    return surveyorsByCode.get(responsibleSurveyorCode.toLowerCase())?.id ?? '';
  }, [areaCode, surveyorsByCode]);
  const mappedResponsibleName = surveyorsById.get(responsibleSurveyorId)?.name ?? '-';
  const selectedSurveyor = useMemo(
    () => surveyorsById.get(selectedSurveyorId),
    [selectedSurveyorId, surveyorsById]
  );
  const selectedSurveyorName = selectedSurveyor?.name ?? '';
  const areaFixedSchedule = useMemo(() => getFixedSurveyScheduleByAreaCode(areaCode), [areaCode]);
  const isExpansionIntent = intent === 'EXPANSION';
  const isPhaseUpgradeIntent = intent === 'PHASE_UPGRADE';
  const effectivePhase = isPhaseUpgradeIntent ? 'THREE_PHASE' : phase;
  const shouldShowMeterOptions = !!intent && !isExpansionIntent;
  const canSubmitRequestTypeSelection = !!intent && (isExpansionIntent || (!!meterSize && !!effectivePhase));
  const resolvedSelection = useMemo(() => {
    if (!canSubmitRequestTypeSelection) {
      return null;
    }

    try {
      return resolveRequestSubmission({
        intent,
        meterSize,
        phase: effectivePhase
      });
    } catch {
      return null;
    }
  }, [canSubmitRequestTypeSelection, effectivePhase, intent, meterSize]);

  const selectionSummary = useMemo(() => {
    if (!intent) {
      return 'ยังไม่เลือกลักษณะงาน';
    }

    if (isExpansionIntent) {
      return REQUEST_INTENT_LABELS[intent];
    }

    if (!meterSize || !effectivePhase) {
      return `${REQUEST_INTENT_LABELS[intent]} / รอเลือกข้อมูลเพิ่มเติม`;
    }

    return `${REQUEST_INTENT_LABELS[intent]} / ${METER_SIZE_LABELS[meterSize]} / ${PHASE_LABELS[effectivePhase]}`;
  }, [effectivePhase, intent, isExpansionIntent, meterSize]);

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

  useEffect(() => {
    setIntentError(null);
    if (intent === 'EXPANSION') {
      setMeterSize('');
      setPhase('');
      setMeterSizeError(null);
      setPhaseError(null);
      return;
    }

    if (intent === 'PHASE_UPGRADE') {
      setPhase('THREE_PHASE');
      setPhaseError(null);
    }
  }, [intent]);

  const recommendation = useMemo(() => {
    const recommendedSurveyorId =
      surveySuggestion?.suggestion?.recommendedSurveyorId ??
      (areaFixedSchedule ? (surveyorsByCode.get(areaFixedSchedule.surveyorCode.toLowerCase())?.id ?? '') : '');
    const recommendedSurveyorName =
      surveyorsById.get(recommendedSurveyorId)?.name ??
      areaFixedSchedule?.surveyorName ??
      '-';

    return {
      recommendedSurveyorId,
      recommendedSurveyorName,
      recommendedSurveyDateIso: normalizeDateInputValue(surveySuggestion?.suggestion?.recommendedSurveyDateIso ?? '')
    };
  }, [
    areaFixedSchedule?.surveyorCode,
    areaFixedSchedule?.surveyorName,
    surveySuggestion?.suggestion?.recommendedSurveyDateIso,
    surveySuggestion?.suggestion?.recommendedSurveyorId,
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

  const recommendedDateText = formatDateOnly(surveySuggestion?.suggestion?.recommendedSurveyDateIso ?? null);

  useEffect(() => {
    if (!areaCode || isLoadingSuggestion) {
      return;
    }

    if (!recommendation.recommendedSurveyorId || !recommendation.recommendedSurveyDateIso) {
      return;
    }

    if (!isFutureBangkokDate(recommendation.recommendedSurveyDateIso)) {
      return;
    }

    const autoApplyKey = `${areaCode}:${recommendation.recommendedSurveyorId}:${recommendation.recommendedSurveyDateIso}`;
    if (autoApplyKey === lastAutoAppliedRecommendationKey) {
      return;
    }

    console.info('[request-form] apply recommendation', {
      before: { selectedSurveyorId, selectedSurveyDate },
      after: {
        selectedSurveyorId: recommendation.recommendedSurveyorId,
        selectedSurveyDate: recommendation.recommendedSurveyDateIso
      }
    });

    setSelectedSurveyorId(recommendation.recommendedSurveyorId);
    setSelectedSurveyDate(recommendation.recommendedSurveyDateIso);
    setSurveyorSelectionStatus('recommended');
    setSurveyDateSelectionStatus('recommended');
    setLastAutoAppliedRecommendationKey(autoApplyKey);
  }, [
    areaCode,
    isLoadingSuggestion,
    lastAutoAppliedRecommendationKey,
    selectedSurveyDate,
    selectedSurveyorId,
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
    if (submitLockRef.current) {
      event.preventDefault();
      return;
    }

    if (!intent) {
      event.preventDefault();
      setIntentError('กรุณาเลือกลักษณะงาน');
      return;
    }

    if (!isExpansionIntent && !meterSize) {
      event.preventDefault();
      setMeterSizeError('กรุณาเลือกขนาดมิเตอร์');
      return;
    }

    if (!isExpansionIntent && !effectivePhase) {
      event.preventDefault();
      setPhaseError('กรุณาเลือกระบบไฟ');
      return;
    }

    if (isPhaseUpgradeIntent && effectivePhase !== 'THREE_PHASE') {
      event.preventDefault();
      setPhaseError('งานเพิ่มเฟสต้องเป็นระบบไฟ 3 เฟส');
      return;
    }

    if (canSubmitRequestTypeSelection && !resolvedSelection) {
      event.preventDefault();
      setPhaseError('ตรวจสอบประเภทคำร้องไม่สำเร็จ');
      return;
    }

    if (!isFutureBangkokDate(selectedSurveyDate)) {
      event.preventDefault();
      setSurveyDateError('วันสำรวจต้องเป็นวันถัดไปจากวันนี้ (โซนเวลาไทย) เท่านั้น');
      return;
    }

    const form = event.currentTarget;
    const hasAddressDetail = [
      form.elements.namedItem('house_number'),
      form.elements.namedItem('village_no'),
      form.elements.namedItem('road'),
      form.elements.namedItem('landmark')
    ]
      .map((element) => ((element as HTMLInputElement | null)?.value ?? '').trim())
      .some((value) => value.length > 0);
    const hasMapPin = !!location;

    if (!hasAddressDetail && !hasMapPin) {
      event.preventDefault();
      setFlexibleAddressError('กรุณาระบุข้อมูลตำแหน่งอย่างน้อย 1 รายการ');
      return;
    }

    setSurveyDateError(null);
    setLocationError(null);
    setFlexibleAddressError(null);
    setIntentError(null);
    setMeterSizeError(null);
    setPhaseError(null);
    submitLockRef.current = true;
    setIsSubmitLocked(true);
  }

  return (
    <form action={createFormAction} className="card space-y-5 p-6" onSubmit={handleSubmit}>
      <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">ประเภทคำร้อง</h3>
          <p className="mt-1 text-xs text-slate-500">เลือกข้อมูล 3 ส่วน เพื่อให้ระบบ map ไป flow ที่ถูกต้อง</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">1) ลักษณะงาน</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {REQUEST_INTENTS.map((option) => (
              <button
                key={option}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                  intent === option
                    ? 'border-[#BFDBFE] bg-[#DBEAFE] text-[#1E40AF] shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
                type="button"
                onClick={() => setIntent(option)}
              >
                {REQUEST_INTENT_LABELS[option]}
              </button>
            ))}
          </div>
          {intentError ? <p className="text-xs text-rose-600">{intentError}</p> : null}
        </div>

        {shouldShowMeterOptions ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">2) ขนาดมิเตอร์</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(['NORMAL', 'THIRTY_ONE_HUNDRED'] as MeterSize[]).map((option) => (
                  <button
                    key={option}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                      meterSize === option
                        ? 'border-[#BFDBFE] bg-[#DBEAFE] text-[#1E40AF] shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                    type="button"
                    onClick={() => {
                      setMeterSize(option);
                      setMeterSizeError(null);
                    }}
                  >
                    {METER_SIZE_LABELS[option]}
                  </button>
                ))}
              </div>
              {meterSizeError ? <p className="text-xs text-rose-600">{meterSizeError}</p> : null}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">3) ระบบไฟ</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {PHASE_TYPES.map((option) => {
                  const isLocked = isPhaseUpgradeIntent && option !== 'THREE_PHASE';
                  return (
                    <button
                      key={option}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                        effectivePhase === option
                          ? 'border-[#BFDBFE] bg-[#DBEAFE] text-[#1E40AF] shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      } ${isLocked ? 'cursor-not-allowed opacity-50' : ''}`}
                      type="button"
                      onClick={() => {
                        if (isLocked) {
                          return;
                        }
                        setPhase(option);
                        setPhaseError(null);
                      }}
                    >
                      {PHASE_LABELS[option]}
                    </button>
                  );
                })}
              </div>
              {isPhaseUpgradeIntent ? (
                <p className="text-xs text-slate-500">งานเพิ่มเฟสจะใช้ระบบไฟ 3 เฟสเสมอ</p>
              ) : null}
              {phaseError ? <p className="text-xs text-rose-600">{phaseError}</p> : null}
            </div>
          </div>
        ) : null}

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs font-medium text-slate-500">สรุปที่เลือก</p>
          <p className="mt-1 text-sm font-medium text-slate-800">{selectionSummary}</p>
        </div>

        {effectivePhase === 'THREE_PHASE' ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            กรณี 3 เฟส ระบบจะตรวจสอบภายหลังว่ารองรับหรือไม่ หากไม่รองรับอาจเข้าสู่กระบวนการขยายเขต
          </p>
        ) : null}

        <input name="intent" type="hidden" value={intent} readOnly />
        <input name="meter_size" type="hidden" value={isExpansionIntent ? '' : meterSize} readOnly />
        <input name="phase" type="hidden" value={isExpansionIntent ? '' : effectivePhase} readOnly />
        <input name="request_type" type="hidden" value={resolvedSelection?.requestType ?? ''} readOnly />
        <input name="flow_type" type="hidden" value={resolvedSelection?.flowType ?? ''} readOnly />
        <input name="path_family" type="hidden" value={resolvedSelection?.pathFamily ?? ''} readOnly />
        <input name="submission_id" type="hidden" value={submissionId} readOnly />
      </section>

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
          พื้นที่ (ตำบล)
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

      <div>
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="text-sm font-medium" htmlFor="house_number">
              บ้านเลขที่
            </label>
            <input
              className="input"
              id="house_number"
              name="house_number"
              placeholder="เช่น 12/5"
              value={houseNumber}
              onChange={(event) => {
                setHouseNumber(event.target.value);
                setFlexibleAddressError(null);
              }}
            />
            <p className="mt-1 text-xs text-slate-500">แนะนำให้ใส่บ้านเลขที่เพื่อให้ช่างหาเจอง่ายขึ้น</p>
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="village_no">
              หมู่
            </label>
            <input
              className="input"
              id="village_no"
              name="village_no"
              placeholder="เช่น 3"
              value={villageNo}
              onChange={(event) => {
                setVillageNo(event.target.value);
                setFlexibleAddressError(null);
              }}
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="road">
              ถนน
            </label>
            <input
              className="input"
              id="road"
              name="road"
              placeholder="เช่น อ่าวนาง"
              value={road}
              onChange={(event) => {
                setRoad(event.target.value);
                setFlexibleAddressError(null);
              }}
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="landmark">
              จุดสังเกต
            </label>
            <input
              className="input"
              id="landmark"
              name="landmark"
              placeholder="เช่น ใกล้เซเว่น / บ้านสีฟ้า / ตรงข้ามมัสยิด"
              value={landmark}
              onChange={(event) => {
                setLandmark(event.target.value);
                setFlexibleAddressError(null);
              }}
            />
          </div>
        </div>
        {flexibleAddressError ? <p className="mt-2 text-xs text-rose-600">{flexibleAddressError}</p> : null}
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
              {surveySuggestion.suggestion?.recommendedSurveyorId ? (
                <span className="ml-2 inline-flex rounded-full border border-[#BFDBFE] bg-[#DBEAFE] px-2 py-0.5 text-xs font-semibold text-[#1E40AF]">
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
              setSurveyDateError(null);
            }}
          />
          <p className="mt-1 text-xs text-slate-500">
            ระบบแนะนำวันสำรวจตามรอบพื้นที่ แต่สามารถเปลี่ยนวันได้ตามการนัดหมายจริง
          </p>
          {surveyDateError ? (
            <p className="mt-1 text-xs text-rose-600">{surveyDateError}</p>
          ) : null}
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

      {createState.error && !isSubmitLocked && !isCreatePending ? (
        <p aria-live="polite" className="text-sm text-rose-600" role="alert">
          {createState.error}
        </p>
      ) : null}

      <button className="btn-primary w-full" disabled={isSubmitLocked || isCreatePending} type="submit">
        {isSubmitLocked || isCreatePending ? 'กำลังบันทึก...' : 'บันทึกคำร้อง'}
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
