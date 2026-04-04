'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SurveyMapMobileToggle } from '@/components/survey-map/SurveyMapMobileToggle';
import { SurveyMapPanel } from '@/components/survey-map/SurveyMapPanel';
import { SurveyQueueList } from '@/components/survey-map/SurveyQueueList';
import { SurveyQueueSortBar } from '@/components/survey-map/SurveyQueueSortBar';
import type { MobileViewMode, SurveyQueueRequest } from '@/components/survey-map/types';
import { useSurveyQueueViewState } from '@/components/survey-map/useSurveyQueueViewState';
import {
  ALL_SURVEYORS_VALUE,
  filterRequestsBySurveyor,
  getAvailableSurveyors,
  isAllSurveyors,
  resolveDefaultSurveyorSelection
} from '@/components/survey-map/surveyor-filter';
import { getRequestStatusLabel, RequestStatus } from '@/lib/requests/types';

type SurveyMapQueuePageProps = {
  requests: SurveyQueueRequest[];
  activeStatuses: RequestStatus[];
  initialSurveyor?: string | null;
};

export function SurveyMapQueuePage({ requests, activeStatuses, initialSurveyor }: SurveyMapQueuePageProps) {
  const [mobileMode, setMobileMode] = useState<MobileViewMode>('LIST');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const availableSurveyors = useMemo(() => getAvailableSurveyors(requests), [requests]);
  const selectedSurveyor = useMemo(
    () => resolveDefaultSurveyorSelection(availableSurveyors, searchParams.get('surveyor') ?? initialSurveyor ?? null),
    [availableSurveyors, initialSurveyor, searchParams]
  );

  const filteredRequests = useMemo(
    () => filterRequestsBySurveyor(requests, selectedSurveyor),
    [requests, selectedSurveyor]
  );

  const {
    selectedRequestId,
    setSelectedRequestId,
    hiddenRequestIds,
    sortedVisibleRequests,
    hideRequest,
    resetHiddenRequests,
    sortMode,
    setSortMode,
    setReferencePoint,
    planningStartId,
    setPlanningStartId,
    distanceReference
  } = useSurveyQueueViewState(filteredRequests);

  const handleSurveyorChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (isAllSurveyors(value)) {
        params.delete('surveyor');
      } else {
        params.set('surveyor', value);
      }

      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const hasCoordinateCount = useMemo(
    () => filteredRequests.filter((request) => request.latitude !== null && request.longitude !== null).length,
    [filteredRequests]
  );

  const referenceDescription = planningStartId
    ? 'จุดเริ่มที่เลือกใน quick planning'
    : distanceReference
      ? 'ศูนย์กลางแผนที่ปัจจุบัน'
      : 'ยังไม่มีจุดอ้างอิง (รอโหลดแผนที่)';

  const handleMapCenterChange = useCallback(
    (latitude: number, longitude: number) => {
      setReferencePoint((previous) => {
        if (previous && Math.abs(previous.latitude - latitude) < 0.000001 && Math.abs(previous.longitude - longitude) < 0.000001) {
          return previous;
        }

        return { latitude, longitude };
      });
    },
    [setReferencePoint]
  );

  return (
    <div className="space-y-4">
      <header className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">คิวสำรวจบนแผนที่</h2>
            <p className="text-sm text-slate-500">สถานะที่เลือก: {activeStatuses.map((status) => getRequestStatusLabel(status)).join(', ')}</p>
            {!isAllSurveyors(selectedSurveyor) ? (
              <p className="text-sm text-slate-500">กำลังแสดง: งานของ{selectedSurveyor}</p>
            ) : null}
          </div>
          <button className="btn-secondary" type="button" onClick={resetHiddenRequests}>
            แสดงงานที่ซ่อน ({hiddenRequestIds.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="font-medium text-slate-700" htmlFor="surveyor-filter">
            ผู้สำรวจ:
          </label>
          <select
            id="surveyor-filter"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            onChange={(event) => handleSurveyorChange(event.target.value)}
            value={selectedSurveyor}
          >
            <option value={ALL_SURVEYORS_VALUE}>ทั้งหมด</option>
            {availableSurveyors.map((surveyor) => (
              <option key={surveyor} value={surveyor}>
                {surveyor}
              </option>
            ))}
          </select>
          {!availableSurveyors.length ? <span className="text-amber-600">ยังไม่ได้ระบุผู้สำรวจ</span> : null}
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-slate-100 p-3">งานทั้งหมดในคิว: <strong>{filteredRequests.length}</strong></div>
          <div className="rounded-lg bg-sky-50 p-3">งานที่มีพิกัด: <strong>{hasCoordinateCount}</strong></div>
          <div className="rounded-lg bg-amber-50 p-3">งานไม่มีพิกัด: <strong>{filteredRequests.length - hasCoordinateCount}</strong></div>
        </div>
      </header>

      <SurveyMapMobileToggle mode={mobileMode} onChange={setMobileMode} />

      <div className="grid gap-4 md:grid-cols-[minmax(340px,420px)_1fr]">
        <aside className={`${mobileMode === 'MAP' ? 'hidden md:block' : ''} space-y-4`}>
          <SurveyQueueSortBar
            sortMode={sortMode}
            onChangeSort={setSortMode}
            planningStartId={planningStartId}
            onChangePlanningStart={setPlanningStartId}
            referenceDescription={referenceDescription}
            requests={sortedVisibleRequests.filter((request) => request.latitude !== null && request.longitude !== null)}
          />

          <SurveyQueueList
            requests={sortedVisibleRequests}
            selectedRequestId={selectedRequestId}
            onSelect={setSelectedRequestId}
            onHide={hideRequest}
            onViewOnMap={(id) => {
              setSelectedRequestId(id);
              setMobileMode('MAP');
            }}
          />
        </aside>

        <section className={`${mobileMode === 'LIST' ? 'hidden md:block' : ''}`}>
          <SurveyMapPanel
            requests={sortedVisibleRequests}
            selectedRequestId={selectedRequestId}
            onSelectRequest={setSelectedRequestId}
            onMapCenterChange={handleMapCenterChange}
          />
        </section>
      </div>
    </div>
  );
}
