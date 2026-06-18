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
        className={`min-h-10 rounded-md px-4 py-2 text-sm font-semibold transition-all duration-200 ${
          mode === 'LIST'
            ? 'border border-[#475569] bg-[#E2E8F0] text-[#334155] shadow-[inset_0_2px_4px_rgba(15,23,42,0.12)]'
            : 'border border-transparent text-[#334155] hover:border-[#64748B] hover:bg-[#F8FAFC]'
        }`}
        onClick={() => onChange('LIST')}
        type="button"
      >
        รายการ
      </button>
      <button
        className={`min-h-10 rounded-md px-4 py-2 text-sm font-semibold transition-all duration-200 ${
          mode === 'MAP'
            ? 'border border-[#475569] bg-[#E2E8F0] text-[#334155] shadow-[inset_0_2px_4px_rgba(15,23,42,0.12)]'
            : 'border border-transparent text-[#334155] hover:border-[#64748B] hover:bg-[#F8FAFC]'
        }`}
        onClick={() => onChange('MAP')}
        type="button"
      >
        แผนที่
      </button>
    </div>
  );
}
