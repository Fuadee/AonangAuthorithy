'use client';

import { MouseEvent, useState } from 'react';
import {
  approveManagerReviewAction,
  confirmPaymentReceivedAction,
  confirmBillingSurveyorSignAction,
  issueBillingAction,
  sendMeterRequestToBillingAction
} from '@/app/actions';
import { RequestStatus } from '@/lib/requests/types';

type MeterWorkflowActionsProps = {
  requestId: string;
  currentStatus: RequestStatus;
};

type MeterAction = 'SEND_TO_BILLING' | 'ISSUE_BILL' | 'SURVEYOR_SIGN' | 'CONFIRM_PAYMENT' | 'MANAGER_APPROVE';

type MeterActionConfig = {
  action: MeterAction;
  buttonLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
};

const STATUS_TO_ACTION: Partial<Record<RequestStatus, MeterAction>> = {
  SURVEY_COMPLETED: 'SEND_TO_BILLING',
  WAIT_BILLING: 'ISSUE_BILL',
  WAIT_SURVEYOR_SIGN: 'SURVEYOR_SIGN',
  BILLED: 'SURVEYOR_SIGN',
  WAIT_PAYMENT: 'CONFIRM_PAYMENT',
  WAIT_MANAGER_REVIEW: 'MANAGER_APPROVE'
};

const ACTION_CONFIG: Record<MeterAction, MeterActionConfig> = {
  SEND_TO_BILLING: {
    action: 'SEND_TO_BILLING',
    buttonLabel: 'ส่งให้ออกใบแจ้งหนี้',
    title: 'ยืนยันส่งงานให้ออกใบแจ้งหนี้',
    description: 'หลังยืนยัน งานจะไปที่สถานะ “รอออกใบแจ้งหนี้” เพื่อให้เจ้าหน้าที่ออกบิล',
    confirmLabel: 'ยืนยันส่งงาน'
  },
  ISSUE_BILL: {
    action: 'ISSUE_BILL',
    buttonLabel: 'ออกใบแจ้งหนี้',
    title: 'ออกใบแจ้งหนี้',
    description: 'กรอกจำนวนเงินและผู้ดำเนินการ แล้วระบบจะส่งต่อไปสถานะ “รอนักสำรวจเซ็น”',
    confirmLabel: 'ยืนยันออกใบแจ้งหนี้'
  },
  SURVEYOR_SIGN: {
    action: 'SURVEYOR_SIGN',
    buttonLabel: 'เซ็นรับรองใบแจ้งหนี้',
    title: 'เซ็นรับรองใบแจ้งหนี้',
    description: 'เมื่อนักสำรวจเซ็นรับรองแล้ว งานจะเข้าสู่สถานะ “รอชำระเงิน”',
    confirmLabel: 'ยืนยันเซ็นรับรอง'
  },
  CONFIRM_PAYMENT: {
    action: 'CONFIRM_PAYMENT',
    buttonLabel: 'ชำระเงินแล้ว',
    title: 'ยืนยันรับชำระเงินแล้ว',
    description: 'หลังยืนยัน งานจะย้ายไปสถานะ “รอผู้จัดการตรวจ” ทันที',
    confirmLabel: 'ยืนยันชำระเงินแล้ว'
  },
  MANAGER_APPROVE: {
    action: 'MANAGER_APPROVE',
    buttonLabel: 'อนุมัติแล้ว',
    title: 'ผู้จัดการอนุมัติปิดงาน',
    description: 'ยืนยันว่าตรวจครบถ้วนแล้ว และปิดงานเป็น “เสร็จสิ้น”',
    confirmLabel: 'ยืนยันอนุมัติ'
  }
};

function ActionModal({
  requestId,
  config,
  onClose
}: {
  requestId: string;
  config: MeterActionConfig;
  onClose: () => void;
}) {
  const onBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onBackdropClick}>
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h4 className="text-lg font-semibold text-slate-900">{config.title}</h4>
        <p className="mt-1 text-sm text-slate-600">{config.description}</p>

        {config.action === 'SEND_TO_BILLING' ? (
          <form action={sendMeterRequestToBillingAction} className="mt-4 space-y-4">
            <input name="request_id" type="hidden" value={requestId} />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={onClose} type="button">
                ยกเลิก
              </button>
              <button className="btn-primary" type="submit">
                {config.confirmLabel}
              </button>
            </div>
          </form>
        ) : null}

        {config.action === 'ISSUE_BILL' ? (
          <form action={issueBillingAction} className="mt-4 space-y-4">
            <input name="request_id" type="hidden" value={requestId} />
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="billing_amount">
                จำนวนเงินใบแจ้งหนี้ (บาท)
              </label>
              <input
                className="input"
                id="billing_amount"
                min="0.01"
                name="billing_amount"
                placeholder="เช่น 1250"
                required
                step="0.01"
                type="number"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="billed_by">
                ออกโดย
              </label>
              <input className="input" id="billed_by" name="billed_by" placeholder="ชื่อเจ้าหน้าที่" required type="text" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="billing_note">
                หมายเหตุ (ถ้ามี)
              </label>
              <textarea className="input min-h-24" id="billing_note" name="billing_note" />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={onClose} type="button">
                ยกเลิก
              </button>
              <button className="btn-primary" type="submit">
                {config.confirmLabel}
              </button>
            </div>
          </form>
        ) : null}

        {config.action === 'SURVEYOR_SIGN' ? (
          <form action={confirmBillingSurveyorSignAction} className="mt-4 space-y-4">
            <input name="request_id" type="hidden" value={requestId} />
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="surveyor_signed_by">
                ผู้เซ็นรับรอง
              </label>
              <input className="input" id="surveyor_signed_by" name="surveyor_signed_by" placeholder="ชื่อนักสำรวจ" required type="text" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="payment_note">
                หมายเหตุขั้นชำระเงิน (ถ้ามี)
              </label>
              <textarea className="input min-h-24" id="payment_note" name="payment_note" />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={onClose} type="button">
                ยกเลิก
              </button>
              <button className="btn-primary" type="submit">
                {config.confirmLabel}
              </button>
            </div>
          </form>
        ) : null}

        {config.action === 'CONFIRM_PAYMENT' ? (
          <form action={confirmPaymentReceivedAction} className="mt-4 space-y-4">
            <input name="request_id" type="hidden" value={requestId} />
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="paid_by">
                รับชำระโดย
              </label>
              <input className="input" id="paid_by" name="paid_by" placeholder="ชื่อเจ้าหน้าที่การเงิน" required type="text" />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={onClose} type="button">
                ยกเลิก
              </button>
              <button className="btn-primary" type="submit">
                {config.confirmLabel}
              </button>
            </div>
          </form>
        ) : null}

        {config.action === 'MANAGER_APPROVE' ? (
          <form action={approveManagerReviewAction} className="mt-4 space-y-4">
            <input name="request_id" type="hidden" value={requestId} />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={onClose} type="button">
                ยกเลิก
              </button>
              <button className="btn-primary" type="submit">
                {config.confirmLabel}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}

export function MeterWorkflowActions({ requestId, currentStatus }: MeterWorkflowActionsProps) {
  const [activeAction, setActiveAction] = useState<MeterAction | null>(null);

  const currentAction = STATUS_TO_ACTION[currentStatus];

  if (!currentAction) {
    return <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">สถานะนี้ยังไม่มีงานใน loop ออกใบแจ้งหนี้</p>;
  }

  const config = ACTION_CONFIG[currentAction];

  return (
    <>
      <button className="btn-primary" type="button" onClick={() => setActiveAction(currentAction)}>
        {config.buttonLabel}
      </button>

      {activeAction ? <ActionModal config={ACTION_CONFIG[activeAction]} onClose={() => setActiveAction(null)} requestId={requestId} /> : null}
    </>
  );
}
