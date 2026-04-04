'use client';

import Link from 'next/link';
import { MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
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

const DOC_INCOMPLETE_GROUP_ACTIONS: WorkflowActionKey[] = ['DOC_INCOMPLETE_COLLECT_ON_SITE', 'DOC_INCOMPLETE_WAIT_CUSTOMER'];

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
  const [isDocIncompleteMenuOpen, setIsDocIncompleteMenuOpen] = useState(false);
  const docIncompleteMenuRef = useRef<HTMLDivElement | null>(null);

  const shouldGroupDocumentReviewActions = currentStatus === 'WAIT_DOCUMENT_REVIEW';
  const groupedDocCompleteAction = useMemo(() => actions.find((action) => action.key === 'DOC_COMPLETE') ?? null, [actions]);
  const groupedDocIncompleteActions = useMemo(
    () => actions.filter((action) => DOC_INCOMPLETE_GROUP_ACTIONS.includes(action.key)),
    [actions]
  );
  const groupedActionKeySet = useMemo(
    () => new Set<WorkflowActionKey>(['DOC_COMPLETE', ...DOC_INCOMPLETE_GROUP_ACTIONS]),
    []
  );
  const actionsForRegularRendering = useMemo(() => {
    if (!shouldGroupDocumentReviewActions) {
      return actions;
    }

    return actions.filter((action) => !groupedActionKeySet.has(action.key));
  }, [actions, groupedActionKeySet, shouldGroupDocumentReviewActions]);

  const visibleActions = maxVisibleActions ? actionsForRegularRendering.slice(0, maxVisibleActions) : actionsForRegularRendering;
  const overflowActions = maxVisibleActions ? actionsForRegularRendering.slice(maxVisibleActions) : [];

  useEffect(() => {
    if (!isDocIncompleteMenuOpen) {
      return;
    }

    const handleOutsideClick = (event: globalThis.MouseEvent) => {
      if (!docIncompleteMenuRef.current?.contains(event.target as Node)) {
        setIsDocIncompleteMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isDocIncompleteMenuOpen]);

  useEffect(() => {
    if (activeAction !== null) {
      setIsDocIncompleteMenuOpen(false);
    }
  }, [activeAction]);

  const handleAction = (event: MouseEvent<HTMLButtonElement>, actionKey: WorkflowActionKey) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveAction(actionKey);
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        {shouldGroupDocumentReviewActions && groupedDocCompleteAction ? (
          <button
            aria-label={`ดำเนินการ ${groupedDocCompleteAction.label}`}
            className={`${ACTION_BUTTON_CLASS[groupedDocCompleteAction.variant]} ${compact ? 'min-h-9 px-2.5 py-1.5 text-sm' : 'min-h-10'} justify-center whitespace-nowrap text-left`}
            disabled={activeAction !== null}
            type="button"
            onClick={(event) => handleAction(event, groupedDocCompleteAction.key)}
          >
            {groupedDocCompleteAction.label}
          </button>
        ) : null}
        {shouldGroupDocumentReviewActions && groupedDocIncompleteActions.length ? (
          <div className="relative" ref={docIncompleteMenuRef}>
            <button
              aria-expanded={isDocIncompleteMenuOpen}
              aria-haspopup="menu"
              className={`${ACTION_BUTTON_CLASS.secondary} ${compact ? 'min-h-9 px-2.5 py-1.5 text-sm' : 'min-h-10'} inline-flex items-center justify-center gap-1 whitespace-nowrap`}
              disabled={activeAction !== null}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsDocIncompleteMenuOpen((prev) => !prev);
              }}
            >
              เอกสารไม่ครบ
              <span className={`text-xs text-slate-600 transition-transform ${isDocIncompleteMenuOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {isDocIncompleteMenuOpen ? (
              <div className="absolute left-0 z-10 mt-1 min-w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-sm">
                {groupedDocIncompleteActions.map((action) => (
                  <button
                    key={action.key}
                    aria-label={`ดำเนินการ ${action.label}`}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    disabled={activeAction !== null}
                    type="button"
                    onClick={(event) => {
                      setIsDocIncompleteMenuOpen(false);
                      handleAction(event, action.key);
                    }}
                  >
                    {action.key === 'DOC_INCOMPLETE_COLLECT_ON_SITE' ? 'รับเอกสารหน้างาน' : 'รอลูกค้านำมา'}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

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
