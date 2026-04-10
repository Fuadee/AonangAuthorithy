import { AxisDetailPanel } from '@/components/smv/axis-detail-panel';
import { AxisSelector } from '@/components/smv/axis-selector';
import { SmvAxis } from '@/lib/smv/types';

type RadarCardProps = {
  axes: SmvAxis[];
  selectedAxisId: string;
  onSelectAxis: (axisId: string) => void;
  onViewChecklist: (axisId: string) => void;
  onEditScore: (axisId: string) => void;
};

function getRadarPoints(scores: number[], radius: number, center: number) {
  return scores
    .map((score, index) => {
      const angle = (Math.PI * 2 * index) / scores.length - Math.PI / 2;
      const normalized = Math.max(0, Math.min(100, score)) / 100;
      const x = center + Math.cos(angle) * radius * normalized;
      const y = center + Math.sin(angle) * radius * normalized;
      return `${x},${y}`;
    })
    .join(' ');
}

function ringPolygon(points: number, radius: number, center: number) {
  return Array.from({ length: points })
    .map((_, index) => {
      const angle = (Math.PI * 2 * index) / points - Math.PI / 2;
      return `${center + Math.cos(angle) * radius},${center + Math.sin(angle) * radius}`;
    })
    .join(' ');
}

export function RadarCard({ axes, selectedAxisId, onSelectAxis, onViewChecklist, onEditScore }: RadarCardProps) {
  const selectedAxis = axes.find((axis) => axis.id === selectedAxisId) ?? axes[0];
  const center = 150;
  const radius = 110;
  const values = axes.map((axis) => axis.score);

  return (
    <section className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-700/70 bg-gradient-to-b from-slate-900 to-slate-950 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.5)] sm:p-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Radar Chart</h2>
          <p className="mt-1 text-sm text-slate-300">ภาพรวม SMV และเจาะลึกรายแกนในบัตรเดียว</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <div className="mx-auto max-w-xl">
          <svg viewBox="0 0 300 300" className="h-auto w-full">
            {[0.25, 0.5, 0.75, 1].map((scale) => (
              <polygon
                key={scale}
                points={ringPolygon(axes.length, radius * scale, center)}
                fill="none"
                stroke="rgba(148,163,184,0.3)"
                strokeWidth="1"
              />
            ))}

            {axes.map((axis, index) => {
              const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2;
              const x = center + Math.cos(angle) * radius;
              const y = center + Math.sin(angle) * radius;
              const lx = center + Math.cos(angle) * (radius + 18);
              const ly = center + Math.sin(angle) * (radius + 18);

              return (
                <g key={axis.id}>
                  <line x1={center} y1={center} x2={x} y2={y} stroke="rgba(148,163,184,0.3)" strokeWidth="1" />
                  <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="fill-slate-200 text-[10px]">
                    {axis.labelTh}
                  </text>
                </g>
              );
            })}

            <polygon points={getRadarPoints(values, radius, center)} fill="rgba(59,130,246,0.25)" stroke="rgba(96,165,250,0.9)" strokeWidth="2" />
          </svg>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Axis Selector</p>
        <AxisSelector axes={axes} selectedAxisId={selectedAxis.id} onSelectAxis={onSelectAxis} />
      </div>

      <div className="mt-4">
        <AxisDetailPanel
          axis={selectedAxis}
          isVisible={Boolean(selectedAxis)}
          onViewChecklist={onViewChecklist}
          onEditScore={onEditScore}
        />
      </div>
    </section>
  );
}
