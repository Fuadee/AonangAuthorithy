'use client';

import { FormEvent, MouseEvent, ReactNode, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { confirmBillingSurveyorSignAction, confirmPaymentReceivedAction, issueBillingAction } from '@/app/actions';
import { getWorkflowActionLabel } from '@/lib/requests/workflow-action-config';
import { RequestStatus } from '@/lib/requests/types';

type BillingWorkflowActionRendererProps = {
  requestId: string;
  currentStatus: RequestStatus;
  isInvoiceSigned: boolean;
  isPaid: boolean;
  compact?: boolean;
};

type BillingAction = 'ISSUE_BILL' | 'SURVEYOR_SIGN' | 'CONFIRM_PAYMENT';

function Modal({ children, title, onClose }: { children: ReactNode; title: string; onClose: () => void }) {
  const onBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onBackdropClick}>
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <h4 className="text-lg font-semibold text-slate-900">{title}</h4>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function BillingWorkflowActionRenderer({
  requestId,
  currentStatus,
  isInvoiceSigned,
  isPaid,
  compact = false
}: BillingWorkflowActionRendererProps) {
  const [activeAction, setActiveAction] = useState<BillingAction | null>(null);
  const [pendingAction, setPendingAction] = useState<BillingAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isModalOpen = activeAction !== null;

  useEffect(() => {
    console.info('[billing-table] modal render state', {
      requestId,
      activeAction,
      isModalOpen,
      pendingAction,
      actionError,
      isSubmitting,
      isPending
    });
  }, [activeAction, actionError, isModalOpen, isPending, isSubmitting, pendingAction, requestId]);

  const closeModal = () => {
    console.info('[billing-table] closeModal()', {
      requestId,
      activeAction,
      pendingAction,
      actionError
    });
    setActiveAction(null);
    setPendingAction(null);
    setActionError(null);
  };
  const compactClass = compact ? 'min-h-9 px-2.5 py-1.5 text-sm' : '';
  const handleActionTriggerClick = (event: MouseEvent<HTMLButtonElement>, action: BillingAction) => {
    event.preventDefault();
    event.stopPropagation();
    setActionError(null);
    setActiveAction(action);
  };
  const debugSubmit = (action: BillingAction, formData: FormData) => {
    console.info('[billing-table] submit action', {
      action,
      requestId,
      stay_on_queue: formData.get('stay_on_queue'),
      return_to: formData.get('return_to')
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>, action: BillingAction) => {
    event.preventDefault();
    event.stopPropagation();

    const formData = new FormData(event.currentTarget);
    debugSubmit(action, formData);
    setActionError(null);
    setPendingAction(action);
    setIsSubmitting(true);

    const actionFn =
      action === 'ISSUE_BILL'
        ? issueBillingAction
        : action === 'SURVEYOR_SIGN'
          ? confirmBillingSurveyorSignAction
          : confirmPaymentReceivedAction;

    try {
      await actionFn(formData);
      console.info('[billing-table] action success before close', { action, requestId });
      closeModal();

      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

      console.info('[billing-table] refreshing queue after modal close', { action, requestId });
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
      setActionError(message);
    } finally {
      setPendingAction(null);
      setIsSubmitting(false);
    }
  };

  if (!['WAIT_BILLING', 'WAIT_ACTION_CONFIRMATION'].includes(currentStatus)) {
    return null;
  }

  return (
    <>
      <div className={`flex flex-wrap items-center ${compact ? 'gap-1.5' : 'gap-2'}`} onClick={(event) => event.stopPropagation()}>
        {currentStatus === 'WAIT_BILLING' ? (
          <button
            className={`btn-primary ${compactClass}`}
            type="button"
            onClick={(event) => handleActionTriggerClick(event, 'ISSUE_BILL')}
          >
            {getWorkflowActionLabel('ISSUE_BILL')}
          </button>
        ) : null}

        {currentStatus === 'WAIT_ACTION_CONFIRMATION' ? (
          <>
            <button
              className={`btn-primary disabled:cursor-not-allowed disabled:opacity-50 ${compactClass}`}
              disabled={isInvoiceSigned}
              type="button"
              onClick={(event) => handleActionTriggerClick(event, 'SURVEYOR_SIGN')}
            >
              {isInvoiceSigned ? 'เซ็นใบแจ้งหนี้แล้ว' : getWorkflowActionLabel('SURVEYOR_SIGN')}
            </button>
            <button
              className={`btn-primary disabled:cursor-not-allowed disabled:opacity-50 ${compactClass}`}
              disabled={isPaid}
              type="button"
              onClick={(event) => handleActionTriggerClick(event, 'CONFIRM_PAYMENT')}
            >
              {isPaid ? 'ชำระเงินแล้ว' : getWorkflowActionLabel('CONFIRM_PAYMENT')}
            </button>
          </>
        ) : null}
      </div>

      {activeAction === 'ISSUE_BILL' ? (
        <Modal title="ออกใบแจ้งหนี้" onClose={closeModal}>
          <form
            className="space-y-3"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => handleSubmit(event, 'ISSUE_BILL')}
          >
            <input name="request_id" type="hidden" value={requestId} />
            <input name="stay_on_queue" type="hidden" value="1" />
            <input name="return_to" type="hidden" value="/billing" />
            <input className="input" min="0.01" name="billing_amount" placeholder="จำนวนเงิน" required step="0.01" type="number" />
            <input className="input" name="billed_by" placeholder="ออกโดย" required type="text" />
            <textarea className="input min-h-24" name="billing_note" placeholder="หมายเหตุ (ถ้ามี)" />
            {actionError ? <p className="text-sm text-rose-600">{actionError}</p> : null}
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" disabled={isSubmitting || isPending || pendingAction === 'ISSUE_BILL'} type="submit">ยืนยันออกใบแจ้งหนี้</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'SURVEYOR_SIGN' ? (
        <Modal title="เซ็นรับรองใบแจ้งหนี้" onClose={closeModal}>
          <form
            className="space-y-3"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => handleSubmit(event, 'SURVEYOR_SIGN')}
          >
            <input name="request_id" type="hidden" value={requestId} />
            <input name="stay_on_queue" type="hidden" value="1" />
            <input name="return_to" type="hidden" value="/billing" />
            <input className="input" name="invoice_signed_by" placeholder="ผู้เซ็นรับรอง" required type="text" />
            {actionError ? <p className="text-sm text-rose-600">{actionError}</p> : null}
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" disabled={isSubmitting || isPending || pendingAction === 'SURVEYOR_SIGN'} type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'CONFIRM_PAYMENT' ? (
        <Modal title="ยืนยันรับชำระเงิน" onClose={closeModal}>
          <form
            className="space-y-3"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => handleSubmit(event, 'CONFIRM_PAYMENT')}
          >
            <input name="request_id" type="hidden" value={requestId} />
            <input name="stay_on_queue" type="hidden" value="1" />
            <input name="return_to" type="hidden" value="/billing" />
            <input className="input" name="paid_by" placeholder="รับชำระโดย" required type="text" />
            {actionError ? <p className="text-sm text-rose-600">{actionError}</p> : null}
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" disabled={isSubmitting || isPending || pendingAction === 'CONFIRM_PAYMENT'} type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
