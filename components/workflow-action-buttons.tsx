'use client';

import Link from 'next/link';
import { MouseEvent, useState } from 'react';
import { SurveyFailActionDialog } from '@/components/survey-fail-action-dialog';
import { SurveyScheduleActionDialog } from '@/components/survey-schedule-action-dialog';
import { WorkflowActionModal } from '@/components/workflow-action-modal';
import { QueueWorkflowAction, WorkflowActionKey, getWorkflowActionLabel } from '@/lib/requests/workflow-action-config';
import { RequestStatus } from '@/lib/requests/types';

type WorkflowActionButtonsProps = {
  actions: QueueWorkflowAction[];
  requestId: string;
  currentStatus: RequestStatus;
  stayOnQueue?: boolean;
  detailHref?: string;
  compact?: boolean;
};

const ACTION_BUTTON_CLASS: Record<'primary' | 'secondary', string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary'
};

export function WorkflowActionButtons({ actions, requestId, currentStatus, stayOnQueue = false, detailHref, compact = false }: WorkflowActionButtonsProps) {
  const [activeAction, setActiveAction] = useState<WorkflowActionKey | null>(null);

  const handleAction = (event: MouseEvent<HTMLButtonElement>, actionKey: WorkflowActionKey) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveAction(actionKey);
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        {actions.map((action) => {
          const disabled = activeAction !== null;

          return (
            <button
              key={action.key}
              aria-label={`ดำเนินการ ${getWorkflowActionLabel(action.key)}`}
              className={`${ACTION_BUTTON_CLASS[action.variant]} ${compact ? 'min-h-9 px-2.5 py-1.5 text-sm' : 'min-h-10'} justify-center whitespace-normal break-words text-left`}
              disabled={disabled}
              type="button"
              onClick={(event) => handleAction(event, action.key)}
            >
              {getWorkflowActionLabel(action.key)}
            </button>
          );
        })}
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
