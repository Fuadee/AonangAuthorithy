'use client';

import { MouseEvent, ReactNode, useState } from 'react';
import {
  completeLayoutDrawingAction,
  markKrabiEstimationCompletedAction,
  markExpansionBillIssuedAction,
  markKrabiDocumentFixCompletedAction,
  markKrabiInProgressAction,
  markKrabiNeedsDocumentFixAction,
  markSentToKrabiAction,
  markCoordinatedWithConstructionAction,
  queueForKrabiDispatchAction,
} from '@/app/actions';
import { BillingWorkflowActionRenderer } from '@/components/billing-workflow-action-renderer';
import { WorkflowActionButtons } from '@/components/workflow-action-buttons';
import { getWorkflowActionLabel, getWorkflowActionsForRequest, WorkflowActionKey } from '@/lib/requests/workflow-action-config';
import { RequestStatus, RequestType } from '@/lib/requests/types';

type MeterWorkflowActionsProps = {
  requestId: string;
  requestType: RequestType;
  currentStatus: RequestStatus;
  fixVerificationMode: 'PHOTO_OR_RESURVEY' | 'RESURVEY_ONLY' | null;
  scheduledSurveyDate: string | null;
  surveyDateCurrent: string | null;
  billingAmount: number | null;
  isInvoiceSigned: boolean;
  isPaid: boolean;
};

type MeterAction = WorkflowActionKey;

function Modal({ children, title, onClose }: { children: ReactNode; title: string; onClose: () => void }) {
  const onBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onBackdropClick}>
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h4 className="text-lg font-semibold text-slate-900">{title}</h4>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function MeterWorkflowActions({
  requestId,
  requestType,
  currentStatus,
  fixVerificationMode,
  scheduledSurveyDate,
  surveyDateCurrent,
  billingAmount,
  isInvoiceSigned,
  isPaid
}: MeterWorkflowActionsProps) {
  const [activeAction, setActiveAction] = useState<MeterAction | null>(null);
  const closeModal = () => setActiveAction(null);
  const resolvedActions = getWorkflowActionsForRequest({
    status: currentStatus,
    request_type: requestType,
    fix_verification_mode: fixVerificationMode,
    scheduled_survey_date: scheduledSurveyDate,
    survey_date_current: surveyDateCurrent,
    invoice_signed_at: isInvoiceSigned ? 'signed' : null,
    paid_at: isPaid ? 'paid' : null
  });

  if (
    ![
      'WAIT_DOCUMENT_REVIEW',
      'SURVEY_COMPLETED',
      'WAIT_DOCUMENT_FROM_CUSTOMER',
      'READY_FOR_SURVEY',
      'IN_SURVEY',
      'WAIT_CUSTOMER_FIX',
      'WAIT_FIX_REVIEW',
      'READY_FOR_RESURVEY',
      'WAIT_BILLING',
      'WAIT_ACTION_CONFIRMATION',
      'WAIT_MANAGER_REVIEW',
      'WAIT_LAYOUT_DRAWING',
      'READY_TO_SEND_KRABI',
      'QUEUED_FOR_KRABI_DISPATCH',
      'SENT_TO_KRABI',
      'WAIT_KRABI_DOCUMENT_CHECK',
      'KRABI_NEEDS_DOCUMENT_FIX',
      'KRABI_IN_PROGRESS',
      'KRABI_ESTIMATION_COMPLETED',
      'BILL_ISSUED',
      'COORDINATED_WITH_CONSTRUCTION'
    ].includes(currentStatus)
  ) {
    return <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">สถานะนี้ยังไม่มีงานใน workflow</p>;
  }

  return (
    <>
      <WorkflowActionButtons actions={resolvedActions} currentStatus={currentStatus} requestId={requestId} />

      <div className="flex flex-wrap gap-2">
        <BillingWorkflowActionRenderer
          billingAmount={billingAmount}
          currentStatus={currentStatus}
          isInvoiceSigned={isInvoiceSigned}
          isPaid={isPaid}
          requestId={requestId}
        />

        {requestType === 'EXPANSION' && ['SURVEY_COMPLETED', 'WAIT_LAYOUT_DRAWING'].includes(currentStatus) ? (
          <button className="btn-primary" type="button" onClick={() => setActiveAction('LAYOUT_DRAWING_DONE')}>
            {getWorkflowActionLabel('LAYOUT_DRAWING_DONE')}
          </button>
        ) : null}
      </div>

      {requestType === 'EXPANSION' && currentStatus === 'READY_TO_SEND_KRABI' ? (
        <button className="btn-primary mt-2" type="button" onClick={() => setActiveAction('QUEUE_KRABI_DISPATCH')}>
          {getWorkflowActionLabel('QUEUE_KRABI_DISPATCH')}
        </button>
      ) : null}

      {requestType === 'EXPANSION' && currentStatus === 'QUEUED_FOR_KRABI_DISPATCH' ? (
        <button className="btn-primary mt-2" type="button" onClick={() => setActiveAction('DISPATCHED_TO_KRABI')}>
          {getWorkflowActionLabel('DISPATCHED_TO_KRABI')}
        </button>
      ) : null}

      {requestType === 'EXPANSION' && ['SENT_TO_KRABI', 'WAIT_KRABI_DOCUMENT_CHECK'].includes(currentStatus) ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="btn-primary" type="button" onClick={() => setActiveAction('KRABI_ACCEPT_AND_START')}>
            {getWorkflowActionLabel('KRABI_ACCEPT_AND_START')}
          </button>
          <button className="btn-secondary" type="button" onClick={() => setActiveAction('KRABI_RETURN_FOR_FIX')}>
            {getWorkflowActionLabel('KRABI_RETURN_FOR_FIX')}
          </button>
        </div>
      ) : null}

      {requestType === 'EXPANSION' && currentStatus === 'KRABI_NEEDS_DOCUMENT_FIX' ? (
        <button className="btn-primary mt-2" type="button" onClick={() => setActiveAction('KRABI_FIX_COMPLETED')}>
          {getWorkflowActionLabel('KRABI_FIX_COMPLETED')}
        </button>
      ) : null}

      {requestType === 'EXPANSION' && currentStatus === 'KRABI_IN_PROGRESS' ? (
        <button className="btn-primary mt-2" type="button" onClick={() => setActiveAction('KRABI_ESTIMATION_COMPLETED')}>
          {getWorkflowActionLabel('KRABI_ESTIMATION_COMPLETED')}
        </button>
      ) : null}

      {requestType === 'EXPANSION' && currentStatus === 'KRABI_ESTIMATION_COMPLETED' ? (
        <button className="btn-primary mt-2" type="button" onClick={() => setActiveAction('KRABI_BILL_ISSUED')}>
          {getWorkflowActionLabel('KRABI_BILL_ISSUED')}
        </button>
      ) : null}

      {requestType === 'EXPANSION' && currentStatus === 'BILL_ISSUED' ? (
        <button className="btn-primary mt-2" type="button" onClick={() => setActiveAction('COORDINATED_WITH_CONSTRUCTION')}>
          {getWorkflowActionLabel('COORDINATED_WITH_CONSTRUCTION')}
        </button>
      ) : null}

      {activeAction === 'QUEUE_KRABI_DISPATCH' ? (
        <Modal title="ยืนยันเข้าคิวส่งเอกสารกระบี่" onClose={closeModal}>
          <form action={queueForKrabiDispatchAction} className="space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <p className="text-sm text-slate-600">ระบบจะกำหนดรอบส่งวันพุธ/ศุกร์ให้อัตโนมัติ</p>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">เข้าคิวส่ง</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'DISPATCHED_TO_KRABI' ? (
        <Modal title="บันทึกการส่งเอกสารไปกระบี่" onClose={closeModal}>
          <form action={markSentToKrabiAction} className="space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="dispatcher_name">ผู้ส่งเอกสาร</label>
              <input className="input" id="dispatcher_name" name="dispatcher_name" required />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยันส่งเอกสารแล้ว</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'KRABI_ACCEPT_AND_START' ? (
        <Modal title="ยืนยันว่าเอกสารครบและกระบี่รับดำเนินการ" onClose={closeModal}>
          <form action={markKrabiInProgressAction} className="space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'KRABI_RETURN_FOR_FIX' ? (
        <Modal title="ส่งกลับให้อ่าวนางแก้ไขเอกสาร" onClose={closeModal}>
          <form action={markKrabiNeedsDocumentFixAction} className="space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="krabi_incomplete_docs_note">เหตุผลที่ส่งกลับ</label>
              <textarea className="input min-h-24" id="krabi_incomplete_docs_note" name="incomplete_docs_note" required />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยันส่งกลับ</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'KRABI_FIX_COMPLETED' ? (
        <Modal title="ยืนยันว่าแก้ไขเอกสารแล้วและพร้อมส่งกระบี่ใหม่" onClose={closeModal}>
          <form action={markKrabiDocumentFixCompletedAction} className="space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'KRABI_ESTIMATION_COMPLETED' ? (
        <Modal title="ยืนยันว่ากระบี่ประมาณการเสร็จแล้ว" onClose={closeModal}>
          <form action={markKrabiEstimationCompletedAction} className="space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'KRABI_BILL_ISSUED' ? (
        <Modal title="ยืนยันว่าออกใบแจ้งหนี้แล้ว" onClose={closeModal}>
          <form action={markExpansionBillIssuedAction} className="space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'COORDINATED_WITH_CONSTRUCTION' ? (
        <Modal title="ยืนยันว่าประสานงานแผนกก่อสร้างแล้ว" onClose={closeModal}>
          <form action={markCoordinatedWithConstructionAction} className="space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'LAYOUT_DRAWING_DONE' ? (
        <Modal title="ยืนยันวาดผังเสร็จ" onClose={closeModal}>
          <form action={completeLayoutDrawingAction} className="space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="layout_note">หมายเหตุ (ถ้ามี)</label>
              <textarea className="input min-h-24" id="layout_note" name="survey_note" />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
