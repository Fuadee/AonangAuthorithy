'use client';

import { MouseEvent, ReactNode, useTransition, useState } from 'react';
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
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const closeModal = () => setActiveAction(null);
  const compactClass = compact ? 'min-h-9 px-2.5 py-1.5 text-sm' : '';
  const handleActionTriggerClick = (event: MouseEvent<HTMLButtonElement>, action: BillingAction) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveAction(action);
  };
  const handleModalAction = (
    serverAction: (formData: FormData) => Promise<void>,
    formData: FormData
  ) => {
    formData.set('stay_on_queue', '1');
    startTransition(async () => {
      await serverAction(formData);
      closeModal();
      router.refresh();
    });
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
          <form action={(formData) => handleModalAction(issueBillingAction, formData)} className="space-y-3" onClick={(event) => event.stopPropagation()}>
            <input name="request_id" type="hidden" value={requestId} />
            <input className="input" min="0.01" name="billing_amount" placeholder="จำนวนเงิน" required step="0.01" type="number" />
            <input className="input" name="billed_by" placeholder="ออกโดย" required type="text" />
            <textarea className="input min-h-24" name="billing_note" placeholder="หมายเหตุ (ถ้ามี)" />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" disabled={isPending} type="submit">ยืนยันออกใบแจ้งหนี้</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'SURVEYOR_SIGN' ? (
        <Modal title="เซ็นรับรองใบแจ้งหนี้" onClose={closeModal}>
          <form
            action={(formData) => handleModalAction(confirmBillingSurveyorSignAction, formData)}
            className="space-y-3"
            onClick={(event) => event.stopPropagation()}
          >
            <input name="request_id" type="hidden" value={requestId} />
            <input className="input" name="invoice_signed_by" placeholder="ผู้เซ็นรับรอง" required type="text" />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" disabled={isPending} type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'CONFIRM_PAYMENT' ? (
        <Modal title="ยืนยันรับชำระเงิน" onClose={closeModal}>
          <form
            action={(formData) => handleModalAction(confirmPaymentReceivedAction, formData)}
            className="space-y-3"
            onClick={(event) => event.stopPropagation()}
          >
            <input name="request_id" type="hidden" value={requestId} />
            <input className="input" name="paid_by" placeholder="รับชำระโดย" required type="text" />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" disabled={isPending} type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
