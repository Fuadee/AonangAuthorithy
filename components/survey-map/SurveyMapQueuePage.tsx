'use client';

import { useMemo, useState } from 'react';
import { SurveyMapMobileToggle } from '@/components/survey-map/SurveyMapMobileToggle';
import { SurveyMapPanel } from '@/components/survey-map/SurveyMapPanel';
import { SurveyQueueList } from '@/components/survey-map/SurveyQueueList';
import { SurveyQueueSortBar } from '@/components/survey-map/SurveyQueueSortBar';
import type { MobileViewMode, SurveyQueueRequest } from '@/components/survey-map/types';
import { useSurveyQueueViewState } from '@/components/survey-map/useSurveyQueueViewState';
import { getRequestStatusLabel, RequestStatus } from '@/lib/requests/types';

type SurveyMapQueuePageProps = {
  requests: SurveyQueueRequest[];
  activeStatuses: RequestStatus[];
};

export function SurveyMapQueuePage({ requests, activeStatuses }: SurveyMapQueuePageProps) {
  const [mobileMode, setMobileMode] = useState<MobileViewMode>('LIST');

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
  } = useSurveyQueueViewState(requests);

  const hasCoordinateCount = useMemo(
    () => requests.filter((request) => request.latitude !== null && request.longitude !== null).length,
    [requests]
  );

  const referenceDescription = planningStartId
    ? 'จุดเริ่มที่เลือกใน quick planning'
    : distanceReference
      ? 'ศูนย์กลางแผนที่ปัจจุบัน'
      : 'ยังไม่มีจุดอ้างอิง (รอโหลดแผนที่)';

  return (
    <div className="space-y-4">
      <header className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">คิวสำรวจบนแผนที่</h2>
            <p className="text-sm text-slate-500">สถานะที่เลือก: {activeStatuses.map((status) => getRequestStatusLabel(status)).join(', ')}</p>
          </div>
          <button className="btn-secondary" type="button" onClick={resetHiddenRequests}>
            แสดงงานที่ซ่อน ({hiddenRequestIds.length})
          </button>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-slate-100 p-3">งานทั้งหมดในคิว: <strong>{requests.length}</strong></div>
          <div className="rounded-lg bg-sky-50 p-3">งานที่มีพิกัด: <strong>{hasCoordinateCount}</strong></div>
          <div className="rounded-lg bg-amber-50 p-3">งานไม่มีพิกัด: <strong>{requests.length - hasCoordinateCount}</strong></div>
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
            onMapCenterChange={(latitude, longitude) => setReferencePoint({ latitude, longitude })}
          />
        </section>
      </div>
    </div>
  );
}
