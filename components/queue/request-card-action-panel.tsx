'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import {
  approveManagerReviewAction,
  approveFixFromPhotoAction,
  confirmDocumentsReceivedFromCustomerAction,
  completeSurveyAction,
  markSurveyPassedAction,
  moveToResurveyAction,
  rejectFixPhotoAndRequireResurveyAction,
  reportCustomerFixAction,
  startSurveyAction,
  updateDocumentReviewDecisionAction
} from '@/app/actions';
import { QueueWorkflowAction, getWorkflowActionLabel, WorkflowActionKey } from '@/lib/requests/workflow-action-config';

type RequestCardActionPanelProps = {
  requestId: string;
  detailHref: string;
  actions: QueueWorkflowAction[];
};

const ACTION_BUTTON_CLASS: Record<'primary' | 'secondary', string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary'
};

async function executeAction(actionKey: WorkflowActionKey, formData: FormData): Promise<void> {
  if (actionKey === 'DOC_COMPLETE' || actionKey === 'DOC_INCOMPLETE_COLLECT_ON_SITE' || actionKey === 'DOC_INCOMPLETE_WAIT_CUSTOMER') {
    await updateDocumentReviewDecisionAction(formData);
    return;
  }

  if (actionKey === 'CONFIRM_DOCS_RECEIVED') return confirmDocumentsReceivedFromCustomerAction(formData);
  if (actionKey === 'START_SURVEY') return startSurveyAction(formData);
  if (actionKey === 'COMPLETE_SURVEY') return completeSurveyAction(formData);
  if (actionKey === 'SURVEY_PASS') return markSurveyPassedAction(formData);
  if (actionKey === 'REPORT_CUSTOMER_FIX') return reportCustomerFixAction(formData);
  if (actionKey === 'SCHEDULE_RESURVEY') return moveToResurveyAction(formData);
  if (actionKey === 'PHOTO_APPROVE') return approveFixFromPhotoAction(formData);
  if (actionKey === 'PHOTO_REJECT_TO_RESURVEY') return rejectFixPhotoAndRequireResurveyAction(formData);
  if (actionKey === 'MANAGER_APPROVE') return approveManagerReviewAction(formData);
}

export function RequestCardActionPanel({ requestId, detailHref, actions }: RequestCardActionPanelProps) {
  const [pendingAction, setPendingAction] = useState<WorkflowActionKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const hasActions = useMemo(() => actions.length > 0, [actions]);

  const handleAction = (action: QueueWorkflowAction) => {
    if (isPending || pendingAction) {
      return;
    }

    if (action.fallbackToDetail) {
      router.push(detailHref);
      return;
    }

    if (action.requiresConfirmation && !window.confirm(action.requiresConfirmation)) {
      return;
    }

    const formData = new FormData();
    formData.set('request_id', requestId);
    formData.set('stay_on_queue', '1');

    if (action.key === 'DOC_COMPLETE') {
      formData.set('decision', 'COMPLETE');
    }
    if (action.key === 'DOC_INCOMPLETE_COLLECT_ON_SITE') {
      formData.set('decision', 'INCOMPLETE_COLLECT_ON_SITE');
    }
    if (action.key === 'DOC_INCOMPLETE_WAIT_CUSTOMER') {
      formData.set('decision', 'INCOMPLETE_WAIT_CUSTOMER');
    }

    if (action.requiresPrompt) {
      const response = window.prompt(action.requiresPrompt.message);
      if (!response?.trim()) {
        return;
      }
      formData.set(action.requiresPrompt.field, response.trim());
    }

    setError(null);
    setPendingAction(action.key);

    startTransition(async () => {
      try {
        await executeAction(action.key, formData);
        router.refresh();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'ไม่สามารถบันทึก action ได้');
      } finally {
        setPendingAction(null);
      }
    });
  };

  return (
    <div className="space-y-1.5">
      {hasActions ? (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const disabled = isPending || pendingAction !== null;
            const isCurrentPending = pendingAction === action.key;

            return (
              <button
                key={action.key}
                aria-label={`ดำเนินการ ${getWorkflowActionLabel(action.key)}`}
                className={`${ACTION_BUTTON_CLASS[action.variant]} min-h-10 justify-center whitespace-normal break-words text-left`}
                disabled={disabled}
                type="button"
                onClick={() => handleAction(action)}
              >
                {isCurrentPending ? 'กำลังบันทึก...' : getWorkflowActionLabel(action.key)}
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

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
