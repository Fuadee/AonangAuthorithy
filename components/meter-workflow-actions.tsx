'use client';

import { MouseEvent, useState } from 'react';
import {
  approveManagerReviewAction,
  confirmPaymentReceivedAction,
  confirmBillingSurveyorSignAction,
  issueBillingAction,
  returnToDocumentReviewAction,
  updateDocumentReviewDecisionAction
} from '@/app/actions';
import { RequestStatus } from '@/lib/requests/types';

type MeterWorkflowActionsProps = {
  requestId: string;
  currentStatus: RequestStatus;
  isInvoiceSigned: boolean;
  isPaid: boolean;
};

type MeterAction =
  | 'DOC_COMPLETE'
  | 'DOC_INCOMPLETE_WAIT'
  | 'DOC_INCOMPLETE_ALLOW'
  | 'RETURN_TO_REVIEW'
  | 'ISSUE_BILL'
  | 'SURVEYOR_SIGN'
  | 'CONFIRM_PAYMENT'
  | 'MANAGER_APPROVE';

type MeterActionConfig = {
  action: MeterAction;
  buttonLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
};

const ACTION_CONFIG: Record<MeterAction, MeterActionConfig> = {
  DOC_COMPLETE: {
    action: 'DOC_COMPLETE',
    buttonLabel: 'เอกสารครบ',
    title: 'ยืนยันเอกสารครบ',
    description: 'ใช้เมื่อเอกสารครบถ้วนและพร้อมส่งต่อไปออกใบแจ้งหนี้',
    confirmLabel: 'ยืนยันเอกสารครบ'
  },
  DOC_INCOMPLETE_WAIT: {
    action: 'DOC_INCOMPLETE_WAIT',
    buttonLabel: 'เอกสารไม่ครบ',
    title: 'ยืนยันเอกสารไม่ครบ',
    description: 'ระบุรายการเอกสารที่ยังขาด เพื่อรอเจ้าหน้าที่ติดตามเอกสารเพิ่ม',
    confirmLabel: 'ยืนยันรอติดตามเอกสาร'
  },
  DOC_INCOMPLETE_ALLOW: {
    action: 'DOC_INCOMPLETE_ALLOW',
    buttonLabel: 'เอกสารไม่ครบ แต่อนุญาตให้ไปต่อ',
    title: 'อนุญาตให้ดำเนินการต่อแม้เอกสารยังไม่ครบ',
    description: 'ใช้ในกรณีพิเศษเท่านั้น โดยต้องบันทึกผู้อนุญาตและเหตุผลทุกครั้ง',
    confirmLabel: 'ยืนยันอนุญาตให้ไปต่อ'
  },
  RETURN_TO_REVIEW: {
    action: 'RETURN_TO_REVIEW',
    buttonLabel: 'ได้รับเอกสารเพิ่มแล้ว',
    title: 'ส่งกลับมาตรวจเอกสารอีกครั้ง',
    description: 'เมื่อได้รับเอกสารเพิ่มแล้ว งานจะย้อนกลับไปสถานะ “รอตรวจเอกสาร”',
    confirmLabel: 'ยืนยันส่งกลับมาตรวจเอกสาร'
  },
  ISSUE_BILL: {
    action: 'ISSUE_BILL',
    buttonLabel: 'ออกใบแจ้งหนี้',
    title: 'ออกใบแจ้งหนี้',
    description: 'กรอกจำนวนเงินและผู้ดำเนินการ แล้วระบบจะเข้าสู่ช่วง “รอดำเนินการหลังแจ้งหนี้”',
    confirmLabel: 'ยืนยันออกใบแจ้งหนี้'
  },
  SURVEYOR_SIGN: {
    action: 'SURVEYOR_SIGN',
    buttonLabel: 'เซ็นใบแจ้งหนี้แล้ว',
    title: 'เซ็นรับรองใบแจ้งหนี้',
    description: 'บันทึกว่างานนี้เซ็นใบแจ้งหนี้แล้ว (ทำก่อนหรือหลังชำระเงินก็ได้)',
    confirmLabel: 'ยืนยันเซ็นรับรอง'
  },
  CONFIRM_PAYMENT: {
    action: 'CONFIRM_PAYMENT',
    buttonLabel: 'ชำระเงินแล้ว',
    title: 'ยืนยันรับชำระเงินแล้ว',
    description: 'บันทึกว่างานนี้ชำระเงินแล้ว (ทำก่อนหรือหลังเซ็นใบแจ้งหนี้ก็ได้)',
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

  const isDocumentDecision = ['DOC_COMPLETE', 'DOC_INCOMPLETE_WAIT', 'DOC_INCOMPLETE_ALLOW'].includes(config.action);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onBackdropClick}>
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h4 className="text-lg font-semibold text-slate-900">{config.title}</h4>
        <p className="mt-1 text-sm text-slate-600">{config.description}</p>

        {isDocumentDecision ? (
          <form action={updateDocumentReviewDecisionAction} className="mt-4 space-y-4">
            <input name="request_id" type="hidden" value={requestId} />
            <input
              name="decision"
              type="hidden"
              value={
                config.action === 'DOC_COMPLETE'
                  ? 'COMPLETE'
                  : config.action === 'DOC_INCOMPLETE_WAIT'
                    ? 'INCOMPLETE_WAIT_FOLLOWUP'
                    : 'INCOMPLETE_ALLOW_PROCEED'
              }
            />

            {config.action === 'DOC_INCOMPLETE_WAIT' ? (
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="incomplete_docs_note">
                  หมายเหตุเอกสารขาด (จำเป็น)
                </label>
                <textarea className="input min-h-24" id="incomplete_docs_note" name="incomplete_docs_note" required />
              </div>
            ) : null}

            {config.action === 'DOC_INCOMPLETE_ALLOW' ? (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="proceed_override_by">
                    ผู้อนุญาตให้ไปต่อ (จำเป็น)
                  </label>
                  <input className="input" id="proceed_override_by" name="proceed_override_by" required type="text" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="proceed_override_reason">
                    เหตุผลการอนุญาต (จำเป็น)
                  </label>
                  <textarea className="input min-h-24" id="proceed_override_reason" name="proceed_override_reason" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="incomplete_docs_note">
                    หมายเหตุเอกสารขาด (ถ้ามี)
                  </label>
                  <textarea className="input min-h-24" id="incomplete_docs_note" name="incomplete_docs_note" />
                </div>
              </>
            ) : null}

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

        {config.action === 'RETURN_TO_REVIEW' ? (
          <form action={returnToDocumentReviewAction} className="mt-4 space-y-4">
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
              <label className="text-sm font-medium text-slate-700" htmlFor="invoice_signed_by">
                ผู้เซ็นรับรอง
              </label>
              <input className="input" id="invoice_signed_by" name="invoice_signed_by" placeholder="ชื่อนักสำรวจ" required type="text" />
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

export function MeterWorkflowActions({ requestId, currentStatus, isInvoiceSigned, isPaid }: MeterWorkflowActionsProps) {
  const [activeAction, setActiveAction] = useState<MeterAction | null>(null);

  if (
    ![
      'WAIT_DOCUMENT_REVIEW',
      'WAIT_DOCUMENT_FOLLOWUP',
      'WAIT_BILLING',
      'WAIT_ACTION_CONFIRMATION',
      'WAIT_MANAGER_REVIEW'
    ].includes(currentStatus)
  ) {
    return <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">สถานะนี้ยังไม่มีงานใน loop ออกใบแจ้งหนี้</p>;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {currentStatus === 'WAIT_DOCUMENT_REVIEW' ? (
          <>
            <button className="btn-primary" type="button" onClick={() => setActiveAction('DOC_COMPLETE')}>
              {ACTION_CONFIG.DOC_COMPLETE.buttonLabel}
            </button>
            <button className="btn-secondary" type="button" onClick={() => setActiveAction('DOC_INCOMPLETE_WAIT')}>
              {ACTION_CONFIG.DOC_INCOMPLETE_WAIT.buttonLabel}
            </button>
            <button className="btn-secondary" type="button" onClick={() => setActiveAction('DOC_INCOMPLETE_ALLOW')}>
              {ACTION_CONFIG.DOC_INCOMPLETE_ALLOW.buttonLabel}
            </button>
          </>
        ) : null}

        {currentStatus === 'WAIT_DOCUMENT_FOLLOWUP' ? (
          <button className="btn-primary" type="button" onClick={() => setActiveAction('RETURN_TO_REVIEW')}>
            {ACTION_CONFIG.RETURN_TO_REVIEW.buttonLabel}
          </button>
        ) : null}

        {currentStatus === 'WAIT_BILLING' ? (
          <button className="btn-primary" type="button" onClick={() => setActiveAction('ISSUE_BILL')}>
            {ACTION_CONFIG.ISSUE_BILL.buttonLabel}
          </button>
        ) : null}
        {currentStatus === 'WAIT_ACTION_CONFIRMATION' ? (
          <>
            <button
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isInvoiceSigned}
              type="button"
              onClick={() => setActiveAction('SURVEYOR_SIGN')}
            >
              {isInvoiceSigned ? 'เซ็นใบแจ้งหนี้แล้ว' : ACTION_CONFIG.SURVEYOR_SIGN.buttonLabel}
            </button>
            <button
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isPaid}
              type="button"
              onClick={() => setActiveAction('CONFIRM_PAYMENT')}
            >
              {isPaid ? 'ชำระเงินแล้ว' : ACTION_CONFIG.CONFIRM_PAYMENT.buttonLabel}
            </button>
          </>
        ) : null}
        {currentStatus === 'WAIT_MANAGER_REVIEW' ? (
          <button className="btn-primary" type="button" onClick={() => setActiveAction('MANAGER_APPROVE')}>
            {ACTION_CONFIG.MANAGER_APPROVE.buttonLabel}
          </button>
        ) : null}
      </div>

      {activeAction ? <ActionModal config={ACTION_CONFIG[activeAction]} onClose={() => setActiveAction(null)} requestId={requestId} /> : null}
    </>
  );
}
