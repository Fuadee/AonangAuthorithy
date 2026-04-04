'use client';

import Link from 'next/link';
import { MouseEvent, useEffect, useMemo, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { updateDocumentReviewDecisionAction } from '@/app/actions';
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

const INCOMPLETE_DOCUMENT_OPTIONS: Array<{ key: IncompleteDocumentOption; title: string; description: string; note: string }> = [
  {
    key: 'DOC_INCOMPLETE_COLLECT_ON_SITE',
    title: 'รับเอกสารหน้างาน',
    description: 'ลูกค้านำเอกสารมาเพิ่มในวันที่ลงพื้นที่ และสามารถเดินงานต่อได้ทันที',
    note: 'เอกสารไม่ครบ: รับเอกสารหน้างาน'
  },
  {
    key: 'DOC_INCOMPLETE_WAIT_CUSTOMER',
    title: 'รอลูกค้านำมา',
    description: 'ยังไม่รับเอกสารในรอบนี้ รอลูกค้านำเอกสารมาเพิ่มเติมภายหลัง',
    note: 'เอกสารไม่ครบ: รอลูกค้านำเอกสารมาเพิ่มเติม'
  }
];

type IncompleteDocumentModalProps = {
  open: boolean;
  options: Array<{ key: IncompleteDocumentOption; title: string; description: string; note: string }>;
  selectedOption: IncompleteDocumentOption | null;
  onSelect: (option: IncompleteDocumentOption) => void;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  error: string | null;
};

function IncompleteDocumentModal({
  open,
  options,
  selectedOption,
  onSelect,
  onClose,
  onConfirm,
  isPending,
  error
}: IncompleteDocumentModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 p-4"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <h4 className="text-xl font-semibold text-slate-900">เลือกวิธีดำเนินการ</h4>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">กรณีเอกสารยังไม่ครบ ให้เลือกวิธีดำเนินการต่อสำหรับคำร้องนี้</p>

        <div className="mt-5 space-y-2.5">
          {options.map((option) => {
            const isSelected = selectedOption === option.key;

            return (
              <button
                key={option.key}
                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/80 shadow-sm ring-1 ring-blue-200'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
                disabled={isPending}
                type="button"
                onClick={() => onSelect(option.key)}
              >
                <p className="text-sm font-semibold text-slate-900">{option.title}</p>
                <p className="mt-1.5 text-sm text-slate-600">{option.description}</p>
              </button>
            );
          })}
        </div>

        {error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button className="btn-secondary" disabled={isPending} type="button" onClick={onClose}>
            ยกเลิก
          </button>
          <button className="btn-primary" disabled={!selectedOption || isPending} type="button" onClick={onConfirm}>
            {isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function WorkflowActionButtons({
  actions,
  requestId,
  currentStatus,
  stayOnQueue = false,
  detailHref,
  compact = false,
  maxVisibleActions
}: WorkflowActionButtonsProps) {
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<WorkflowActionKey | null>(null);
  const [isIncompleteDocumentModalOpen, setIsIncompleteDocumentModalOpen] = useState(false);
  const [selectedIncompleteDocumentOption, setSelectedIncompleteDocumentOption] = useState<IncompleteDocumentOption | null>(null);
  const [incompleteDocumentError, setIncompleteDocumentError] = useState<string | null>(null);
  const [isSubmittingIncompleteDecision, startIncompleteDecisionTransition] = useTransition();

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

  const incompleteDocumentOptions = useMemo(
    () =>
      INCOMPLETE_DOCUMENT_OPTIONS.filter((option) => groupedDocIncompleteActions.some((action) => action.key === option.key)),
    [groupedDocIncompleteActions]
  );

  const visibleActions = maxVisibleActions ? actionsForRegularRendering.slice(0, maxVisibleActions) : actionsForRegularRendering;
  const overflowActions = maxVisibleActions ? actionsForRegularRendering.slice(maxVisibleActions) : [];
  const singleOverflowAction = overflowActions.length === 1 ? overflowActions[0] : null;
  const dropdownOverflowActions = singleOverflowAction ? [] : overflowActions;
  const hasWorkflowActionButtons =
    (shouldGroupDocumentReviewActions && (Boolean(groupedDocCompleteAction) || groupedDocIncompleteActions.length > 0)) || visibleActions.length > 0;
  const hasAnyActionControls = hasWorkflowActionButtons || Boolean(singleOverflowAction) || dropdownOverflowActions.length > 0 || Boolean(detailHref);

  useEffect(() => {
    if (activeAction !== null) {
      setIsIncompleteDocumentModalOpen(false);
    }
  }, [activeAction]);

  useEffect(() => {
    if (!isIncompleteDocumentModalOpen) {
      setSelectedIncompleteDocumentOption(null);
      setIncompleteDocumentError(null);
    }
  }, [isIncompleteDocumentModalOpen]);

  const handleAction = (event: MouseEvent<HTMLButtonElement>, actionKey: WorkflowActionKey) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveAction(actionKey);
  };

  const handleConfirmIncompleteDocument = () => {
    if (!selectedIncompleteDocumentOption) {
      return;
    }

    const selectedOption = incompleteDocumentOptions.find((option) => option.key === selectedIncompleteDocumentOption);
    if (!selectedOption) {
      setIncompleteDocumentError('ไม่พบตัวเลือกที่เลือก กรุณาลองใหม่อีกครั้ง');
      return;
    }

    const decision = selectedOption.key === 'DOC_INCOMPLETE_COLLECT_ON_SITE' ? 'INCOMPLETE_COLLECT_ON_SITE' : 'INCOMPLETE_WAIT_CUSTOMER';
    const formData = new FormData();
    formData.set('request_id', requestId);
    formData.set('decision', decision);
    formData.set('incomplete_docs_note', selectedOption.note);
    if (stayOnQueue) {
      formData.set('stay_on_queue', '1');
    }

    setIncompleteDocumentError(null);

    startIncompleteDecisionTransition(async () => {
      try {
        await updateDocumentReviewDecisionAction(formData);
        setIsIncompleteDocumentModalOpen(false);
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด';
        setIncompleteDocumentError(message || 'ไม่สามารถบันทึกผลตรวจเอกสารได้ กรุณาลองใหม่อีกครั้ง');
      }
    });
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        {shouldGroupDocumentReviewActions && groupedDocCompleteAction ? (
          <button
            aria-label={`ดำเนินการ ${groupedDocCompleteAction.label}`}
            className={`${ACTION_BUTTON_CLASS[groupedDocCompleteAction.variant]} ${compact ? 'min-h-9 px-2.5 py-1.5 text-sm' : 'min-h-10'} justify-center whitespace-nowrap text-left`}
            disabled={activeAction !== null || isSubmittingIncompleteDecision}
            type="button"
            onClick={(event) => handleAction(event, groupedDocCompleteAction.key)}
          >
            {groupedDocCompleteAction.label}
          </button>
        ) : null}
        {shouldGroupDocumentReviewActions && groupedDocIncompleteActions.length ? (
          <button
            aria-haspopup="dialog"
            className={`${ACTION_BUTTON_CLASS.secondary} ${compact ? 'min-h-9 px-2.5 py-1.5 text-sm' : 'min-h-10'} inline-flex items-center justify-center gap-1 whitespace-nowrap`}
            disabled={activeAction !== null || isSubmittingIncompleteDecision}
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsIncompleteDocumentModalOpen(true);
            }}
          >
            เอกสารไม่ครบ
          </button>
        ) : null}

        {visibleActions.map((action) => {
          const disabled = activeAction !== null || isSubmittingIncompleteDecision;

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

        {singleOverflowAction ? (
          <button
            aria-label={`ดำเนินการ ${singleOverflowAction.label}`}
            className={`${ACTION_BUTTON_CLASS[singleOverflowAction.variant]} ${compact ? 'min-h-9 px-2.5 py-1.5 text-sm' : 'min-h-10'} justify-center whitespace-normal break-words text-left`}
            disabled={activeAction !== null || isSubmittingIncompleteDecision}
            type="button"
            onClick={(event) => handleAction(event, singleOverflowAction.key)}
          >
            {singleOverflowAction.label}
          </button>
        ) : null}

        {dropdownOverflowActions.length ? (
          <details className="relative">
            <summary className={`btn-secondary cursor-pointer list-none whitespace-nowrap text-sm ${compact ? 'min-h-9 px-2.5 py-1.5' : 'min-h-10 px-3 py-2'}`}>เพิ่มเติม</summary>
            <div className="absolute right-0 z-10 mt-1 min-w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
              {dropdownOverflowActions.map((action) => (
                <button
                  key={action.key}
                  aria-label={`ดำเนินการ ${action.label}`}
                  className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  disabled={activeAction !== null || isSubmittingIncompleteDecision}
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

        {!hasAnyActionControls ? <span className="px-1 text-slate-400">-</span> : null}
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

      <IncompleteDocumentModal
        error={incompleteDocumentError}
        isPending={isSubmittingIncompleteDecision}
        open={isIncompleteDocumentModalOpen}
        options={incompleteDocumentOptions}
        selectedOption={selectedIncompleteDocumentOption}
        onClose={() => setIsIncompleteDocumentModalOpen(false)}
        onConfirm={handleConfirmIncompleteDocument}
        onSelect={setSelectedIncompleteDocumentOption}
      />
    </div>
  );
}
