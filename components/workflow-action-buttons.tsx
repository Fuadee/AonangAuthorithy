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
type IncompleteDocumentOption = Extract<WorkflowActionKey, 'DOC_INCOMPLETE_COLLECT_ON_SITE' | 'DOC_INCOMPLETE_WAIT_CUSTOMER'>;

const INCOMPLETE_DOCUMENT_OPTIONS: Array<{ key: IncompleteDocumentOption; title: string; description: string }> = [
  {
    key: 'DOC_INCOMPLETE_COLLECT_ON_SITE',
    title: 'รับเอกสารหน้างาน',
    description: 'รับเอกสารที่ขาดเพิ่มเติมหน้างาน และส่งต่อเพื่อตรวจเอกสารต่อได้ทันที'
  },
  {
    key: 'DOC_INCOMPLETE_WAIT_CUSTOMER',
    title: 'รอลูกค้านำมา',
    description: 'ให้ลูกค้านำเอกสารมาเพิ่มเติมภายหลัง ก่อนดำเนินการขั้นตอนถัดไป'
  }
];

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
  const [isIncompleteDocumentChooserOpen, setIsIncompleteDocumentChooserOpen] = useState(false);
  const [selectedIncompleteDocumentOption, setSelectedIncompleteDocumentOption] = useState<IncompleteDocumentOption | null>(null);
  const incompleteDocumentChooserRef = useRef<HTMLDivElement | null>(null);

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
    if (!isIncompleteDocumentChooserOpen) {
      return;
    }

    const handleOutsideClick = (event: globalThis.MouseEvent) => {
      if (!incompleteDocumentChooserRef.current?.contains(event.target as Node)) {
        setIsIncompleteDocumentChooserOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isIncompleteDocumentChooserOpen]);

  useEffect(() => {
    if (activeAction !== null) {
      setIsIncompleteDocumentChooserOpen(false);
    }
  }, [activeAction]);

  useEffect(() => {
    if (!isIncompleteDocumentChooserOpen) {
      setSelectedIncompleteDocumentOption(null);
    }
  }, [isIncompleteDocumentChooserOpen]);

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
          <div className="relative" ref={incompleteDocumentChooserRef}>
            <button
              aria-expanded={isIncompleteDocumentChooserOpen}
              aria-haspopup="dialog"
              className={`${ACTION_BUTTON_CLASS.secondary} ${compact ? 'min-h-9 px-2.5 py-1.5 text-sm' : 'min-h-10'} inline-flex items-center justify-center gap-1 whitespace-nowrap`}
              disabled={activeAction !== null}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsIncompleteDocumentChooserOpen(true);
              }}
            >
              เอกสารไม่ครบ
            </button>
            {isIncompleteDocumentChooserOpen ? (
              <div className="absolute left-0 top-full z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                <p className="text-sm font-semibold text-slate-900">เลือกวิธีดำเนินการเอกสารไม่ครบ</p>
                <div className="mt-3 space-y-2">
                  {INCOMPLETE_DOCUMENT_OPTIONS.filter((option) => groupedDocIncompleteActions.some((action) => action.key === option.key)).map((option) => {
                    const isSelected = selectedIncompleteDocumentOption === option.key;

                    return (
                      <button
                        key={option.key}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                        type="button"
                        onClick={() => setSelectedIncompleteDocumentOption(option.key)}
                      >
                        <p className="text-sm font-medium text-slate-900">{option.title}</p>
                        <p className="mt-1 text-xs text-slate-600">{option.description}</p>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <button className="btn-secondary" type="button" onClick={() => setIsIncompleteDocumentChooserOpen(false)}>
                    ยกเลิก
                  </button>
                  <button
                    className="btn-primary"
                    disabled={!selectedIncompleteDocumentOption}
                    type="button"
                    onClick={(event) => {
                      if (!selectedIncompleteDocumentOption) {
                        return;
                      }

                      setIsIncompleteDocumentChooserOpen(false);
                      handleAction(event, selectedIncompleteDocumentOption);
                    }}
                  >
                    ยืนยัน
                  </button>
                </div>
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
