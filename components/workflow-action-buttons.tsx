'use client';

import Link from 'next/link';
import { MouseEvent, useState } from 'react';
import { SurveyFailActionDialog } from '@/components/survey-fail-action-dialog';
import { SurveyScheduleActionDialog } from '@/components/survey-schedule-action-dialog';
import { WorkflowActionModal } from '@/components/workflow-action-modal';
import { QueueWorkflowAction, WorkflowActionKey } from '@/lib/requests/workflow-action-config';
import { RequestStatus } from '@/lib/requests/types';

type WorkflowActionButtonsProps = {
  actions: QueueWorkflowAction[];
  requestId: string;
  currentStatus: RequestStatus;
  stayOnQueue?: boolean;
  detailHref?: string;
  compact?: boolean;
  maxVisibleActions?: number;
};

const ACTION_BUTTON_CLASS: Record<'primary' | 'secondary', string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary'
};

export function WorkflowActionButtons({
  actions,
  requestId,
  currentStatus,
  stayOnQueue = false,
  detailHref,
  compact = false,
  maxVisibleActions
}: WorkflowActionButtonsProps) {
  const [activeAction, setActiveAction] = useState<WorkflowActionKey | null>(null);
  const visibleActions = maxVisibleActions ? actions.slice(0, maxVisibleActions) : actions;
  const overflowActions = maxVisibleActions ? actions.slice(maxVisibleActions) : [];

  const handleAction = (event: MouseEvent<HTMLButtonElement>, actionKey: WorkflowActionKey) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveAction(actionKey);
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        {visibleActions.map((action) => {
          const disabled = activeAction !== null;

          return (
            <button
              key={action.key}
              aria-label={`ดำเนินการ ${action.label}`}
              className={`${ACTION_BUTTON_CLASS[action.variant]} ${compact ? 'min-h-9 px-2.5 py-1.5 text-sm' : 'min-h-10'} justify-center whitespace-normal break-words text-left`}
              disabled={disabled}
              type="button"
              onClick={(event) => handleAction(event, action.key)}
            >
              {action.label}
            </button>
          );
        })}
        {overflowActions.length ? (
          <details className="relative">
            <summary className={`btn-secondary cursor-pointer list-none whitespace-nowrap text-sm ${compact ? 'min-h-9 px-2.5 py-1.5' : 'min-h-10 px-3 py-2'}`}>เพิ่มเติม</summary>
            <div className="absolute right-0 z-10 mt-1 min-w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
              {overflowActions.map((action) => (
                <button
                  key={action.key}
                  aria-label={`ดำเนินการ ${action.label}`}
                  className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  disabled={activeAction !== null}
                  type="button"
                  onClick={(event) => handleAction(event, action.key)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </details>
        ) : null}
        {detailHref ? (
          <Link className={`btn-secondary whitespace-nowrap text-sm ${compact ? 'min-h-9 px-2.5 py-1.5' : 'min-h-10 px-3 py-2'}`} href={detailHref}>
            ดูรายละเอียด
          </Link>
        ) : null}
      </div>

      <SurveyScheduleActionDialog
        actionKey={activeAction === 'SCHEDULE_SURVEY' || activeAction === 'EDIT_SURVEY_DATE' ? activeAction : null}
        onClose={() => setActiveAction(null)}
        requestId={requestId}
        stayOnQueue={stayOnQueue}
      />

      <SurveyFailActionDialog
        open={activeAction === 'SURVEY_FAIL'}
        onClose={() => setActiveAction(null)}
        requestId={requestId}
        stayOnQueue={stayOnQueue}
      />

      <WorkflowActionModal
        actionKey={activeAction && activeAction !== 'SURVEY_FAIL' && activeAction !== 'SCHEDULE_SURVEY' && activeAction !== 'EDIT_SURVEY_DATE' ? activeAction : null}
        currentStatus={currentStatus}
        onClose={() => setActiveAction(null)}
        requestId={requestId}
        stayOnQueue={stayOnQueue}
      />
    </div>
  );
}
