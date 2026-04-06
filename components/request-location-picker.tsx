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
  const [locationNote, setLocationNote] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Coordinate | null>(null);

  const coordinateText = useMemo(() => {
    if (!selectedLocation) {
      return 'ยังไม่ได้ปักหมุด';
    }

    return `Latitude: ${selectedLocation.latitude.toFixed(6)} | Longitude: ${selectedLocation.longitude.toFixed(6)}`;
  }, [selectedLocation]);

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
      <p className="mt-1 text-sm text-slate-600">กรุณาคลิกบนแผนที่เพื่อปักหมุดตำแหน่ง</p>

      <div className="mt-3">
        <MapPicker selectedLocation={selectedLocation} onPick={handlePick} />
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
