'use client';

import { buildGoogleMapsDirectionsUrl } from '@/lib/maps/google-maps';
import { getRequestStatusLabel } from '@/lib/requests/types';
import type { SurveyQueueRequest } from '@/components/survey-map/types';

type SurveyQueueCardProps = {
  request: SurveyQueueRequest;
  selected: boolean;
  onSelect: (id: string) => void;
  onViewOnMap: (id: string) => void;
  onHide: (id: string) => void;
};

function formatDate(value: string | null): string {
  if (!value) {
    return '-';
  }
  return new Date(`${value}T00:00:00`).toLocaleDateString('th-TH', { dateStyle: 'medium' });
}

export function SurveyQueueCard({ request, selected, onSelect, onViewOnMap, onHide }: SurveyQueueCardProps) {
  const hasCoordinate = request.latitude !== null && request.longitude !== null;

  return (
    <article
      className={`rounded-xl border p-4 ${selected ? 'border-brand-600 bg-brand-50/60' : 'border-slate-200 bg-white'}`}
      onClick={() => onSelect(request.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(request.id);
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-700">{request.request_no}</p>
          <p className="text-sm text-slate-700">{request.customer_name}</p>
          <p className="text-xs text-slate-500">พื้นที่: {request.area_name}</p>
          <p className="text-xs text-slate-500">ผู้สำรวจ: {request.assigned_surveyor ?? '-'}</p>
          <p className="text-xs text-slate-500">นัดสำรวจล่าสุด: {formatDate(request.latest_survey_date)}</p>
          <p className="text-xs text-slate-500">สถานะ: {getRequestStatusLabel(request.status)}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button className="btn-secondary" onClick={() => onViewOnMap(request.id)} type="button" disabled={!hasCoordinate}>
          ดูบนแผนที่
        </button>
        <a
          className={`btn-primary ${!hasCoordinate ? 'pointer-events-none opacity-50' : ''}`}
          href={hasCoordinate ? buildGoogleMapsDirectionsUrl({ latitude: request.latitude as number, longitude: request.longitude as number }) : '#'}
          rel="noreferrer"
          target="_blank"
          onClick={(event) => {
            if (!hasCoordinate) {
              event.preventDefault();
            }
          }}
        >
          นำทาง
        </a>
        <button className="btn-secondary" onClick={() => onHide(request.id)} type="button">
          ซ่อนชั่วคราว
        </button>
      </div>
    </article>
  );
}
