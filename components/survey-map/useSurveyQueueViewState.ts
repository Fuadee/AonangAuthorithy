'use client';

import { useMemo, useState } from 'react';
import { calculateDistanceKm, LatLng } from '@/lib/maps/distance';
import type { SortMode, SurveyQueueRequest } from '@/components/survey-map/types';

const HIDE_STATE_SESSION_KEY = 'survey-map-hidden-requests-v1';

function getInitialHiddenState(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(HIDE_STATE_SESSION_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistHiddenState(ids: string[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(HIDE_STATE_SESSION_KEY, JSON.stringify(ids));
}

export function useSurveyQueueViewState(requests: SurveyQueueRequest[]) {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [hiddenRequestIds, setHiddenRequestIds] = useState<string[]>(getInitialHiddenState);
  const [sortMode, setSortMode] = useState<SortMode>('NEAREST_FROM_MAP_CENTER');
  const [referencePoint, setReferencePoint] = useState<LatLng | null>(null);
  const [planningStartId, setPlanningStartId] = useState<string | null>(null);

  const visibleRequests = useMemo(
    () => requests.filter((request) => !hiddenRequestIds.includes(request.id)),
    [hiddenRequestIds, requests]
  );

  const selectedRequest = useMemo(
    () => visibleRequests.find((request) => request.id === selectedRequestId) ?? null,
    [selectedRequestId, visibleRequests]
  );

  const planningStart = useMemo(
    () => visibleRequests.find((request) => request.id === planningStartId) ?? null,
    [planningStartId, visibleRequests]
  );

  const distanceReference = useMemo(
    () =>
      planningStart && planningStart.latitude !== null && planningStart.longitude !== null
        ? { latitude: planningStart.latitude, longitude: planningStart.longitude }
        : referencePoint,
    [planningStart, referencePoint]
  );

  const sortedVisibleRequests = useMemo(() => {
    const withDistance = visibleRequests.map((request) => {
      const hasCoordinate = request.latitude !== null && request.longitude !== null;
      const distanceKm = hasCoordinate && distanceReference
        ? calculateDistanceKm(
            { latitude: request.latitude as number, longitude: request.longitude as number },
            distanceReference
          )
        : Number.POSITIVE_INFINITY;

      return { request, distanceKm };
    });

    withDistance.sort((a, b) => {
      if (sortMode === 'NEAREST_FROM_MAP_CENTER') {
        return a.distanceKm - b.distanceKm;
      }
      if (sortMode === 'FARTHEST_FROM_MAP_CENTER') {
        return b.distanceKm - a.distanceKm;
      }
      if (sortMode === 'OLDEST_CREATED') {
        return new Date(a.request.created_at).getTime() - new Date(b.request.created_at).getTime();
      }
      if (sortMode === 'NEWEST_CREATED') {
        return new Date(b.request.created_at).getTime() - new Date(a.request.created_at).getTime();
      }
      if (sortMode === 'LATEST_SURVEY_DATE') {
        const aTime = a.request.latest_survey_date ? new Date(`${a.request.latest_survey_date}T00:00:00`).getTime() : 0;
        const bTime = b.request.latest_survey_date ? new Date(`${b.request.latest_survey_date}T00:00:00`).getTime() : 0;
        return bTime - aTime;
      }

      return a.request.request_no.localeCompare(b.request.request_no, 'th');
    });

    return withDistance.map((entry) => entry.request);
  }, [distanceReference, sortMode, visibleRequests]);

  const hideRequest = (id: string) => {
    const next = hiddenRequestIds.includes(id) ? hiddenRequestIds : [...hiddenRequestIds, id];
    setHiddenRequestIds(next);
    persistHiddenState(next);
    if (selectedRequestId === id) {
      setSelectedRequestId(null);
    }
    if (planningStartId === id) {
      setPlanningStartId(null);
    }
  };

  const resetHiddenRequests = () => {
    setHiddenRequestIds([]);
    persistHiddenState([]);
  };

  return {
    selectedRequestId,
    selectedRequest,
    setSelectedRequestId,
    hiddenRequestIds,
    visibleRequests,
    sortedVisibleRequests,
    hideRequest,
    resetHiddenRequests,
    sortMode,
    setSortMode,
    referencePoint,
    setReferencePoint,
    planningStartId,
    setPlanningStartId,
    distanceReference
  };
}
