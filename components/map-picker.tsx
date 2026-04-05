'use client';

import { useEffect, useRef } from 'react';
import { loadLeaflet, type LeafletMap, type LeafletMarker } from '@/lib/maps/leaflet-loader';

type Coordinate = {
  latitude: number;
  longitude: number;
};

type MapPickerProps = {
  selectedLocation: Coordinate | null;
  onPick: (location: Coordinate) => void;
  panTo: Coordinate | null;
};

const DEFAULT_CENTER: [number, number] = [8.0376, 98.8241];
const DEFAULT_ZOOM = 12;

export function MapPicker({ selectedLocation, onPick, panTo }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);

  useEffect(() => {
    let disposed = false;

    async function initMap() {
      if (!containerRef.current || mapRef.current) {
        return;
      }

      try {
        const L = await loadLeaflet();
        if (disposed || !containerRef.current) {
          return;
        }

        const map = L.map(containerRef.current, {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        map.on('click', (event) => {
          onPick({
            latitude: event.latlng.lat,
            longitude: event.latlng.lng
          });
        });

        mapRef.current = map;
      } catch {
        // let parent handle no marker state; map box remains visible
      }
    }

    initMap();

    return () => {
      disposed = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [onPick]);

  useEffect(() => {
    async function syncMarker() {
      if (!mapRef.current) {
        return;
      }

      const L = window.L ?? (await loadLeaflet());

      if (!selectedLocation) {
        markerRef.current?.remove();
        markerRef.current = null;
        return;
      }

      const latLng: [number, number] = [selectedLocation.latitude, selectedLocation.longitude];
      if (!markerRef.current) {
        markerRef.current = L.marker(latLng).addTo(mapRef.current);
      } else {
        markerRef.current.setLatLng(latLng);
      }
    }

    void syncMarker();
  }, [selectedLocation]);

  useEffect(() => {
    if (!mapRef.current || !panTo) {
      return;
    }

    mapRef.current.setView([panTo.latitude, panTo.longitude], 15);
  }, [panTo]);

  return <div className="h-80 w-full overflow-hidden rounded-lg border border-slate-300" ref={containerRef} />;
}
