'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { WorkflowActionModal } from '@/components/workflow-action-modal';
import { QueueWorkflowAction, getWorkflowActionLabel, WorkflowActionKey } from '@/lib/requests/workflow-action-config';
import { RequestStatus } from '@/lib/requests/types';

type RequestCardActionPanelProps = {
  requestId: string;
  detailHref: string;
  currentStatus: RequestStatus;
  actions: QueueWorkflowAction[];
};

const ACTION_BUTTON_CLASS: Record<'primary' | 'secondary', string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary'
};

export function RequestCardActionPanel({ requestId, detailHref, currentStatus, actions }: RequestCardActionPanelProps) {
  const [activeAction, setActiveAction] = useState<WorkflowActionKey | null>(null);
  const router = useRouter();

  const hasActions = useMemo(() => actions.length > 0, [actions]);

  const handleAction = (action: QueueWorkflowAction) => {
    if (action.fallbackToDetail) {
      router.push(detailHref);
      return;
    }

    setActiveAction(action.key);
  };

  return (
    <div className="space-y-1.5">
      {hasActions ? (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const disabled = activeAction !== null;

            return (
              <button
                key={action.key}
                aria-label={`ดำเนินการ ${getWorkflowActionLabel(action.key)}`}
                className={`${ACTION_BUTTON_CLASS[action.variant]} min-h-10 justify-center whitespace-normal break-words text-left`}
                disabled={disabled}
                type="button"
                onClick={() => handleAction(action)}
              >
                {getWorkflowActionLabel(action.key)}
              </button>
            );
          })}
          <Link className="btn-secondary min-h-10 whitespace-nowrap px-3 py-2 text-sm" href={detailHref}>
            ดูรายละเอียด
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-slate-500">สถานะนี้ต้องดำเนินการผ่านหน้า detail</p>
          <Link className="btn-secondary min-h-10 whitespace-nowrap px-3 py-2 text-sm" href={detailHref}>
            ดูรายละเอียด
          </Link>
        </div>
      )}

      <WorkflowActionModal actionKey={activeAction} currentStatus={currentStatus} onClose={() => setActiveAction(null)} requestId={requestId} stayOnQueue />
    </div>
  );
}
