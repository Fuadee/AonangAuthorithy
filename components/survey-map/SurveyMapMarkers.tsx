'use client';

import { useEffect, useRef } from 'react';
import { buildGoogleMapsDirectionsUrl } from '@/lib/maps/google-maps';
import { getRequestStatusLabel } from '@/lib/requests/types';
import { getSurveyorDisplayNameByRaw, getSurveyorName } from '@/components/survey-map/surveyor-filter';
import { LeafletGlobal, LeafletMap, LeafletMarker } from '@/lib/maps/leaflet-loader';
import type { SurveyQueueRequest } from '@/components/survey-map/types';

type SurveyMapMarkersProps = {
  leaflet: LeafletGlobal;
  map: LeafletMap;
  requests: SurveyQueueRequest[];
  selectedRequestId: string | null;
  onSelectRequest: (id: string) => void;
};

const DEFAULT_ICON_URL = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const SELECTED_ICON_URL = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png';
const SHADOW_URL = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function SurveyMapMarkers({ leaflet, map, requests, selectedRequestId, onSelectRequest }: SurveyMapMarkersProps) {
  const markerByIdRef = useRef<Map<string, LeafletMarker>>(new Map());

  useEffect(() => {
    markerByIdRef.current.forEach((marker) => marker.remove());
    markerByIdRef.current.clear();
    const markerById = markerByIdRef.current;
    const markerPane = (map as unknown as { getPane?: (name: string) => HTMLElement | undefined }).getPane?.('markerPane');

    if (!markerPane) {
      return;
    }

    const defaultIcon = leaflet.icon({ iconUrl: DEFAULT_ICON_URL, shadowUrl: SHADOW_URL, iconSize: [25, 41], iconAnchor: [12, 41] });
    const selectedIcon = leaflet.icon({ iconUrl: SELECTED_ICON_URL, shadowUrl: SHADOW_URL, iconSize: [25, 41], iconAnchor: [12, 41] });

    requests
      .filter((request) => request.latitude !== null && request.longitude !== null)
      .forEach((request) => {
        const surveyorName = getSurveyorDisplayNameByRaw(getSurveyorName(request));
        const marker = leaflet
          .marker([request.latitude as number, request.longitude as number], {
            icon: request.id === selectedRequestId ? selectedIcon : defaultIcon
          })
          .addTo(map)
          .bindPopup(
            `<div style="min-width:180px"><strong>${escapeHtml(request.request_no)}</strong><br/>${escapeHtml(request.customer_name)}<br/>ผู้สำรวจ: ${escapeHtml(surveyorName)}<br/>${escapeHtml(getRequestStatusLabel(request.status))}<br/><a href="${buildGoogleMapsDirectionsUrl({ latitude: request.latitude as number, longitude: request.longitude as number })}" target="_blank" rel="noreferrer">เปิดใน Google Maps</a></div>`
          );

        marker.on('click', () => onSelectRequest(request.id));
        markerById.set(request.id, marker);
      });

    return () => {
      markerById.forEach((marker) => marker.remove());
      markerById.clear();
    };
  }, [leaflet, map, onSelectRequest, requests, selectedRequestId]);

  useEffect(() => {
    if (!selectedRequestId) {
      return;
    }

    const marker = markerByIdRef.current.get(selectedRequestId);
    marker?.openPopup();
  }, [selectedRequestId]);

  return null;
}
