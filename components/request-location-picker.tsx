'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';

type Coordinate = {
  latitude: number;
  longitude: number;
};

type RequestLocationPickerProps = {
  onLocationChange: (location: Coordinate | null) => void;
  submitError: string | null;
};

const MapPicker = dynamic(() => import('@/components/map-picker').then((module) => module.MapPicker), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-sm text-slate-500">
      กำลังโหลดแผนที่...
    </div>
  )
});

export function RequestLocationPicker({ onLocationChange, submitError }: RequestLocationPickerProps) {
  const [keyword, setKeyword] = useState('');
  const [locationNote, setLocationNote] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Coordinate | null>(null);
  const [panTo, setPanTo] = useState<Coordinate | null>(null);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const coordinateText = useMemo(() => {
    if (!selectedLocation) {
      return 'ยังไม่ได้ปักหมุด';
    }

    return `Latitude: ${selectedLocation.latitude.toFixed(6)} | Longitude: ${selectedLocation.longitude.toFixed(6)}`;
  }, [selectedLocation]);

  async function handleSearch() {
    const query = keyword.trim();
    if (!query) {
      setSearchFeedback('กรุณากรอกคำค้นหาสถานที่');
      return;
    }

    setIsSearching(true);
    setSearchFeedback(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=th&q=${encodeURIComponent(query)}`,
        {
          headers: {
            Accept: 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('ค้นหาสถานที่ไม่สำเร็จ');
      }

      const results = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      if (!results.length) {
        setSearchFeedback('ไม่พบสถานที่จากคำค้นนี้ กรุณาลองคำอื่น');
        return;
      }

      const bestResult = results[0];
      const lat = Number(bestResult.lat);
      const lng = Number(bestResult.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setSearchFeedback('ผลการค้นหาไม่สมบูรณ์ กรุณาลองใหม่');
        return;
      }

      setPanTo({ latitude: lat, longitude: lng });
      setSearchFeedback(`พบตำแหน่งใกล้เคียง: ${bestResult.display_name}`);
    } catch {
      setSearchFeedback('ไม่สามารถค้นหาสถานที่ได้ในขณะนี้ กรุณาลองใหม่');
    } finally {
      setIsSearching(false);
    }
  }

  function handlePick(location: Coordinate) {
    setSelectedLocation(location);
    onLocationChange(location);
  }

  function clearMarker() {
    setSelectedLocation(null);
    onLocationChange(null);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-base font-semibold text-slate-800">ตำแหน่งสถานที่</h3>
      <p className="mt-1 text-sm text-slate-600">กรุณาคลิกบนแผนที่เพื่อปักหมุด</p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          className="input mt-0"
          placeholder="ค้นหาสถานที่ เช่น อ่าวนาง, หมู่บ้าน, โรงเรียน"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <button className="btn-secondary whitespace-nowrap" type="button" onClick={handleSearch} disabled={isSearching}>
          {isSearching ? 'กำลังค้นหา...' : 'ค้นหา'}
        </button>
      </div>

      {searchFeedback ? <p className="mt-2 text-xs text-slate-500">{searchFeedback}</p> : null}

      <div className="mt-3">
        <MapPicker selectedLocation={selectedLocation} onPick={handlePick} panTo={panTo} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className={selectedLocation ? 'font-medium text-slate-800' : 'text-slate-500'}>{coordinateText}</span>
        <button className="btn-secondary" type="button" onClick={clearMarker}>
          ล้างหมุด
        </button>
      </div>

      {submitError ? <p className="mt-2 text-sm text-rose-600">{submitError}</p> : null}

      <div className="mt-3">
        <label className="text-sm font-medium" htmlFor="location_note">
          หมายเหตุจุดเพิ่มเติม (ถ้ามี)
        </label>
        <textarea
          className="input min-h-24"
          id="location_note"
          name="location_note"
          value={locationNote}
          onChange={(event) => setLocationNote(event.target.value)}
        />
      </div>

      <input name="latitude" type="hidden" value={selectedLocation?.latitude ?? ''} />
      <input name="longitude" type="hidden" value={selectedLocation?.longitude ?? ''} />
    </section>
  );
}
