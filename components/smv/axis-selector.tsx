import { SmvAxis } from '@/lib/smv/types';

type AxisSelectorProps = {
  axes: SmvAxis[];
  selectedAxisId: string;
  onSelectAxis: (axisId: string) => void;
};

function getAxisTone(score: number) {
  if (score < 60) {
    return 'border-amber-400/50 bg-amber-500/10 text-amber-100';
  }

  if (score >= 80) {
    return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100';
  }

  return 'border-slate-500/60 bg-slate-700/50 text-slate-100';
}

export function AxisSelector({ axes, selectedAxisId, onSelectAxis }: AxisSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {axes.map((axis) => {
        const isActive = axis.id === selectedAxisId;

        return (
          <button
            key={axis.id}
            type="button"
            onClick={() => onSelectAxis(axis.id)}
            className={`rounded-xl border px-3 py-2 text-sm transition-all duration-200 ${
              isActive
                ? 'border-blue-300 bg-blue-500/20 text-blue-50 shadow-[0_0_0_1px_rgba(96,165,250,0.8),0_0_24px_rgba(59,130,246,0.35)]'
                : `${getAxisTone(axis.score)} hover:border-blue-300/50 hover:bg-slate-700/70`
            }`}
            aria-pressed={isActive}
          >
            <span className="font-medium">{axis.labelTh}</span>
            <span className="ml-2 text-xs opacity-80">{axis.score}</span>
          </button>
        );
      })}
    </div>
  );
}
