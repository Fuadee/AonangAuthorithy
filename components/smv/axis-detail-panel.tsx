import { ArrowDownRight, ArrowRight, ArrowUpRight, Edit3, ListChecks } from 'lucide-react';
import { SmvAxis } from '@/lib/smv/types';

type AxisDetailPanelProps = {
  axis: SmvAxis;
  isVisible: boolean;
  onViewChecklist: (axisId: string) => void;
  onEditScore: (axisId: string) => void;
};

function trendMeta(trend: SmvAxis['trend']) {
  if (trend === 'up') {
    return { label: 'ดีขึ้น', icon: ArrowUpRight, className: 'text-emerald-300' };
  }

  if (trend === 'down') {
    return { label: 'ลดลง', icon: ArrowDownRight, className: 'text-rose-300' };
  }

  return { label: 'คงที่', icon: ArrowRight, className: 'text-blue-200' };
}

export function AxisDetailPanel({ axis, isVisible, onViewChecklist, onEditScore }: AxisDetailPanelProps) {
  const trend = trendMeta(axis.trend);
  const TrendIcon = trend.icon;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-blue-300/35 bg-slate-900/70 transition-all duration-300 ease-out ${
        isVisible ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-200/80">Axis Detail</p>
            <h3 className="mt-1 text-xl font-semibold text-white">{axis.labelTh}</h3>
          </div>
          <div className="rounded-xl border border-blue-300/40 bg-blue-400/10 px-3 py-1.5 text-blue-100">
            <p className="text-xs">Score</p>
            <p className="text-lg font-semibold">{axis.score}</p>
          </div>
        </div>

        <div className="grid gap-3 text-sm text-slate-200 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-3">
            <p className="text-xs text-slate-400">Trend</p>
            <p className={`mt-1 flex items-center gap-1 font-medium ${trend.className}`}>
              <TrendIcon className="h-4 w-4" />
              {trend.label}
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-3">
            <p className="text-xs text-slate-400">Today</p>
            <p className="mt-1 font-medium">{axis.today}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-3">
            <p className="text-xs text-slate-400">Week</p>
            <p className="mt-1 font-medium">{axis.week}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-3">
            <p className="text-xs text-slate-400">Streak</p>
            <p className="mt-1 font-medium">{axis.streak} วัน</p>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
            <span>Progress</span>
            <span>{axis.score}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-700">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-300 transition-all duration-500"
              style={{ width: `${axis.score}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onViewChecklist(axis.id)}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-300/50 bg-blue-500/20 px-3 py-2 text-sm font-medium text-blue-50 transition hover:bg-blue-500/30"
          >
            <ListChecks className="h-4 w-4" />
            View Checklist
          </button>
          <button
            type="button"
            onClick={() => onEditScore(axis.id)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-400/60 bg-slate-700/60 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
          >
            <Edit3 className="h-4 w-4" />
            Edit Score
          </button>
        </div>
      </div>
    </div>
  );
}
