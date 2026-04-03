'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { SurveyMapMarkers } from '@/components/survey-map/SurveyMapMarkers';
import { loadLeaflet, LeafletGlobal, LeafletMap } from '@/lib/maps/leaflet-loader';
import type { SurveyQueueRequest } from '@/components/survey-map/types';

type SurveyMapPanelProps = {
  requests: SurveyQueueRequest[];
  selectedRequestId: string | null;
  onSelectRequest: (id: string) => void;
  onMapCenterChange: (latitude: number, longitude: number) => void;
};

const DEFAULT_CENTER: [number, number] = [8.0376, 98.8241];
const DEFAULT_ZOOM = 12;

export function SurveyMapPanel({ requests, selectedRequestId, onSelectRequest, onMapCenterChange }: SurveyMapPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const onMapCenterChangeRef = useRef(onMapCenterChange);
  const [leaflet, setLeaflet] = useState<LeafletGlobal | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    onMapCenterChangeRef.current = onMapCenterChange;
  }, [onMapCenterChange]);

  useEffect(() => {
    let disposed = false;

    async function initMap() {
      if (!containerRef.current || mapRef.current) {
        return;
      }

      try {
        const loadedLeaflet = await loadLeaflet();
        if (disposed || !containerRef.current) {
          return;
        }

        const map = loadedLeaflet.map(containerRef.current, { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
        loadedLeaflet
          .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
          })
          .addTo(map);

        map.on('moveend', () => {
          const center = map.getCenter();
          onMapCenterChangeRef.current(center.lat, center.lng);
        });

        mapRef.current = map;
        setLeaflet(loadedLeaflet);
        setIsMapReady(true);

        const center = map.getCenter();
        onMapCenterChangeRef.current(center.lat, center.lng);
      } catch {
        // noop
      }
    }

    void initMap();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      setIsMapReady(false);
      setLeaflet(null);
    };
  }, []);

  const requestsWithCoordinates = useMemo(
    () => requests.filter((request) => request.latitude !== null && request.longitude !== null),
    [requests]
  );

  useEffect(() => {
    if (!mapRef.current || !requestsWithCoordinates.length) {
      return;
    }

    if (requestsWithCoordinates.length === 1) {
      const target = requestsWithCoordinates[0];
      mapRef.current.setView([target.latitude as number, target.longitude as number], 14);
      return;
    }

    const latitudes = requestsWithCoordinates.map((request) => request.latitude as number);
    const longitudes = requestsWithCoordinates.map((request) => request.longitude as number);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...latitudes), Math.min(...longitudes)],
      [Math.max(...latitudes), Math.max(...longitudes)]
    ];

    mapRef.current.fitBounds(bounds, { padding: [30, 30] });
  }, [requestsWithCoordinates]);

  useEffect(() => {
    if (!mapRef.current || !selectedRequestId) {
      return;
    }

    const selected = requests.find((request) => request.id === selectedRequestId);
    if (!selected || selected.latitude === null || selected.longitude === null) {
      return;
    }

    mapRef.current.setView([selected.latitude, selected.longitude], Math.max(mapRef.current.getZoom(), 15));
  }, [requests, selectedRequestId]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 150);

    return () => window.clearTimeout(timer);
  }, [requests.length, selectedRequestId]);

  return (
    <div className="card h-[60vh] min-h-[360px] overflow-hidden md:h-[calc(100vh-220px)]">
      <div className="h-full w-full" ref={containerRef} />
      {leaflet && mapRef.current && isMapReady ? (
        <SurveyMapMarkers
          leaflet={leaflet}
          map={mapRef.current}
          requests={requests}
          selectedRequestId={selectedRequestId}
          onSelectRequest={onSelectRequest}
        />
      ) : null}
    </div>
  );
}
