'use client';

import { resolveAreaDisplayName } from '@/lib/requests/areas';

type AreaResponsibleCellProps = {
  areaName: string | null;
  responsiblePersonName: string;
};

export function AreaResponsibleCell({ areaName, responsiblePersonName }: AreaResponsibleCellProps) {
  return (
    <div className="space-y-0.5">
      <p className="text-sm font-medium leading-5 text-slate-800">{resolveAreaDisplayName(areaName)}</p>
      <p className="truncate text-xs leading-4 text-slate-500" title={`ผู้รับผิดชอบ: ${responsiblePersonName}`}>
        ผู้รับผิดชอบ: {responsiblePersonName}
      </p>
    </div>
  );
}
