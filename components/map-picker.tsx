'use client';

import { useEffect, useRef } from 'react';

type Coordinate = {
  latitude: number;
  longitude: number;
};

type MapPickerProps = {
  selectedLocation: Coordinate | null;
  onPick: (location: Coordinate) => void;
  panTo: Coordinate | null;
};

type LeafletMap = {
  on: (event: string, handler: (event: { latlng: { lat: number; lng: number } }) => void) => void;
  setView: (latLng: [number, number], zoom?: number) => void;
  remove: () => void;
};

type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker;
  setLatLng: (latLng: [number, number]) => void;
  remove: () => void;
};

type LeafletGlobal = {
  map: (element: HTMLElement, options?: { center: [number, number]; zoom: number }) => LeafletMap;
  tileLayer: (url: string, options?: Record<string, unknown>) => { addTo: (map: LeafletMap) => void };
  marker: (latLng: [number, number]) => LeafletMarker;
};

declare global {
  interface Window {
    L?: LeafletGlobal;
    __leafletLoader__?: Promise<LeafletGlobal>;
  }
}

const DEFAULT_CENTER: [number, number] = [8.0376, 98.8241];
const DEFAULT_ZOOM = 12;

function loadLeaflet(): Promise<LeafletGlobal> {
  if (window.L) {
    return Promise.resolve(window.L);
  }

  if (window.__leafletLoader__) {
    return window.__leafletLoader__;
  }

  window.__leafletLoader__ = new Promise((resolve, reject) => {
    const existingCss = document.querySelector('link[data-leaflet="true"]');
    if (!existingCss) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.crossOrigin = '';
      link.dataset.leaflet = 'true';
      document.head.appendChild(link);
    }

    const existingScript = document.querySelector('script[data-leaflet="true"]') as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener('load', () => (window.L ? resolve(window.L) : reject(new Error('โหลด Leaflet ไม่สำเร็จ'))));
      existingScript.addEventListener('error', () => reject(new Error('โหลด Leaflet ไม่สำเร็จ')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.crossOrigin = '';
    script.async = true;
    script.dataset.leaflet = 'true';
    script.onload = () => {
      if (!window.L) {
        reject(new Error('โหลด Leaflet ไม่สำเร็จ'));
        return;
      }
      resolve(window.L);
    };
    script.onerror = () => reject(new Error('โหลด Leaflet ไม่สำเร็จ'));
    document.body.appendChild(script);
  });

  return window.__leafletLoader__;
}

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
