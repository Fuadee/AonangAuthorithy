'use client';

import type { MobileViewMode } from '@/components/survey-map/types';

type SurveyMapMobileToggleProps = {
  mode: MobileViewMode;
  onChange: (mode: MobileViewMode) => void;
};

export function SurveyMapMobileToggle({ mode, onChange }: SurveyMapMobileToggleProps) {
  return (
    <div className="grid grid-cols-2 rounded-lg border border-slate-300 bg-white p-1 md:hidden">
      <button
        className={`rounded-md px-3 py-2 text-sm font-medium ${mode === 'LIST' ? 'bg-brand-600 text-white' : 'text-slate-600'}`}
        onClick={() => onChange('LIST')}
        type="button"
      >
        รายการ
      </button>
      <button
        className={`rounded-md px-3 py-2 text-sm font-medium ${mode === 'MAP' ? 'bg-brand-600 text-white' : 'text-slate-600'}`}
        onClick={() => onChange('MAP')}
        type="button"
      >
        แผนที่
      </button>
    </div>
  );
}
