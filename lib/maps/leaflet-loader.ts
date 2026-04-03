export type LeafletMapClickEvent = {
  latlng: { lat: number; lng: number };
};

export type LeafletMap = {
  on: (event: string, handler: (event: LeafletMapClickEvent) => void) => void;
  off: (event: string, handler?: (event: LeafletMapClickEvent) => void) => void;
  setView: (latLng: [number, number], zoom?: number) => void;
  fitBounds: (bounds: [[number, number], [number, number]], options?: { padding?: [number, number] }) => void;
  getCenter: () => { lat: number; lng: number };
  getZoom: () => number;
  invalidateSize: () => void;
  remove: () => void;
};

export type LeafletPopup = {
  setContent: (content: string) => LeafletPopup;
  setLatLng: (latLng: [number, number]) => LeafletPopup;
  openOn: (map: LeafletMap) => LeafletPopup;
};

export type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker;
  remove: () => void;
  bindPopup: (content: string) => LeafletMarker;
  openPopup: () => void;
  setIcon: (icon: unknown) => void;
  on: (event: string, handler: () => void) => void;
  off: (event: string, handler?: () => void) => void;
};

export type LeafletGlobal = {
  map: (element: HTMLElement, options?: { center: [number, number]; zoom: number }) => LeafletMap;
  tileLayer: (url: string, options?: Record<string, unknown>) => { addTo: (map: LeafletMap) => void };
  marker: (latLng: [number, number], options?: Record<string, unknown>) => LeafletMarker;
  icon: (options: Record<string, unknown>) => unknown;
};

declare global {
  interface Window {
    L?: LeafletGlobal;
    __leafletLoader__?: Promise<LeafletGlobal>;
  }
}

export async function loadLeaflet(): Promise<LeafletGlobal> {
  if (window.L) {
    return window.L;
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
