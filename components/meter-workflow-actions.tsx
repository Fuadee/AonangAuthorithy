'use client';

import { MouseEvent, ReactNode, useState } from 'react';
import {
  approveManagerReviewAction,
  completeSurveyAction,
  confirmDocumentsReceivedFromCustomerAction,
  confirmOnSiteDocumentsCompleteAction,
  confirmPaymentReceivedAction,
  confirmBillingSurveyorSignAction,
  issueBillingAction,
  startSurveyAction,
  updateSurveyScheduleAction,
  updateDocumentReviewDecisionAction
} from '@/app/actions';
import { RequestStatus } from '@/lib/requests/types';

type MeterWorkflowActionsProps = {
  requestId: string;
  currentStatus: RequestStatus;
  isInvoiceSigned: boolean;
  isPaid: boolean;
  collectDocsOnSite: boolean;
  hasCurrentSurveyDate: boolean;
};

type MeterAction =
  | 'DOC_COMPLETE'
  | 'DOC_INCOMPLETE_COLLECT_ON_SITE'
  | 'DOC_INCOMPLETE_WAIT_CUSTOMER'
  | 'CONFIRM_DOCS_RECEIVED'
  | 'START_SURVEY'
  | 'SCHEDULE_SURVEY'
  | 'EDIT_SURVEY_DATE'
  | 'COMPLETE_SURVEY'
  | 'CONFIRM_ON_SITE_DOCS_COMPLETE'
  | 'ISSUE_BILL'
  | 'SURVEYOR_SIGN'
  | 'CONFIRM_PAYMENT'
  | 'MANAGER_APPROVE';

const ACTION_LABELS: Record<MeterAction, string> = {
  DOC_COMPLETE: 'เอกสารครบ',
  DOC_INCOMPLETE_COLLECT_ON_SITE: 'เอกสารไม่ครบ (รับเอกสารหน้างาน)',
  DOC_INCOMPLETE_WAIT_CUSTOMER: 'เอกสารไม่ครบ (รอลูกค้านำมา)',
  CONFIRM_DOCS_RECEIVED: 'ได้รับเอกสารแล้ว',
  START_SURVEY: 'รับงาน / ไปสำรวจ',
  SCHEDULE_SURVEY: 'กำหนดวันสำรวจ',
  EDIT_SURVEY_DATE: 'แก้ไขวันนัด',
  COMPLETE_SURVEY: 'สำรวจเสร็จ',
  CONFIRM_ON_SITE_DOCS_COMPLETE: 'เอกสารครบแล้ว',
  ISSUE_BILL: 'ออกใบแจ้งหนี้',
  SURVEYOR_SIGN: 'เซ็นใบแจ้งหนี้แล้ว',
  CONFIRM_PAYMENT: 'ชำระเงินแล้ว',
  MANAGER_APPROVE: 'อนุมัติแล้ว'
};

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
  currentStatus,
  isInvoiceSigned,
  isPaid,
  collectDocsOnSite,
  hasCurrentSurveyDate
}: MeterWorkflowActionsProps) {
  const [activeAction, setActiveAction] = useState<MeterAction | null>(null);

  const closeModal = () => setActiveAction(null);

  if (
    ![
      'WAIT_DOCUMENT_REVIEW',
      'WAIT_DOCUMENT_FROM_CUSTOMER',
      'READY_FOR_SURVEY',
      'IN_SURVEY',
      'SURVEY_COMPLETED',
      'WAIT_BILLING',
      'WAIT_ACTION_CONFIRMATION',
      'WAIT_MANAGER_REVIEW'
    ].includes(currentStatus)
  ) {
    return <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">สถานะนี้ยังไม่มีงานใน workflow ขอมิเตอร์</p>;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {currentStatus === 'WAIT_DOCUMENT_REVIEW' ? (
          <>
            <button className="btn-primary" type="button" onClick={() => setActiveAction('DOC_COMPLETE')}>
              {ACTION_LABELS.DOC_COMPLETE}
            </button>
            <button className="btn-secondary" type="button" onClick={() => setActiveAction('DOC_INCOMPLETE_COLLECT_ON_SITE')}>
              {ACTION_LABELS.DOC_INCOMPLETE_COLLECT_ON_SITE}
            </button>
            <button className="btn-secondary" type="button" onClick={() => setActiveAction('DOC_INCOMPLETE_WAIT_CUSTOMER')}>
              {ACTION_LABELS.DOC_INCOMPLETE_WAIT_CUSTOMER}
            </button>
          </>
        ) : null}

        {currentStatus === 'WAIT_DOCUMENT_FROM_CUSTOMER' ? (
          <button className="btn-primary" type="button" onClick={() => setActiveAction('CONFIRM_DOCS_RECEIVED')}>
            {ACTION_LABELS.CONFIRM_DOCS_RECEIVED}
          </button>
        ) : null}

        {currentStatus === 'READY_FOR_SURVEY' ? (
          <>
            {!hasCurrentSurveyDate ? (
              <button className="btn-primary" type="button" onClick={() => setActiveAction('SCHEDULE_SURVEY')}>
                {ACTION_LABELS.SCHEDULE_SURVEY}
              </button>
            ) : (
              <>
                <button className="btn-primary" type="button" onClick={() => setActiveAction('START_SURVEY')}>
                  {ACTION_LABELS.START_SURVEY}
                </button>
                <button className="btn-secondary" type="button" onClick={() => setActiveAction('EDIT_SURVEY_DATE')}>
                  {ACTION_LABELS.EDIT_SURVEY_DATE}
                </button>
              </>
            )}
          </>
        ) : null}

        {currentStatus === 'IN_SURVEY' ? (
          <button className="btn-primary" type="button" onClick={() => setActiveAction('COMPLETE_SURVEY')}>
            {ACTION_LABELS.COMPLETE_SURVEY}
          </button>
        ) : null}

        {currentStatus === 'SURVEY_COMPLETED' && collectDocsOnSite ? (
          <button className="btn-primary" type="button" onClick={() => setActiveAction('CONFIRM_ON_SITE_DOCS_COMPLETE')}>
            {ACTION_LABELS.CONFIRM_ON_SITE_DOCS_COMPLETE}
          </button>
        ) : null}

        {currentStatus === 'WAIT_BILLING' ? (
          <button className="btn-primary" type="button" onClick={() => setActiveAction('ISSUE_BILL')}>
            {ACTION_LABELS.ISSUE_BILL}
          </button>
        ) : null}

        {currentStatus === 'WAIT_ACTION_CONFIRMATION' ? (
          <>
            <button className="btn-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={isInvoiceSigned} type="button" onClick={() => setActiveAction('SURVEYOR_SIGN')}>
              {isInvoiceSigned ? 'เซ็นใบแจ้งหนี้แล้ว' : ACTION_LABELS.SURVEYOR_SIGN}
            </button>
            <button className="btn-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={isPaid} type="button" onClick={() => setActiveAction('CONFIRM_PAYMENT')}>
              {isPaid ? 'ชำระเงินแล้ว' : ACTION_LABELS.CONFIRM_PAYMENT}
            </button>
          </>
        ) : null}

        {currentStatus === 'WAIT_MANAGER_REVIEW' ? (
          <button className="btn-primary" type="button" onClick={() => setActiveAction('MANAGER_APPROVE')}>
            {ACTION_LABELS.MANAGER_APPROVE}
          </button>
        ) : null}
      </div>

      {activeAction === 'DOC_COMPLETE' ? (
        <Modal title="ยืนยันเอกสารครบ" onClose={closeModal}>
          <form action={updateDocumentReviewDecisionAction} className="space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <input name="decision" type="hidden" value="COMPLETE" />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'DOC_INCOMPLETE_COLLECT_ON_SITE' || activeAction === 'DOC_INCOMPLETE_WAIT_CUSTOMER' ? (
        <Modal
          title={activeAction === 'DOC_INCOMPLETE_COLLECT_ON_SITE' ? 'ระบุว่าเอกสารไม่ครบ (รับเอกสารหน้างาน)' : 'ระบุว่าเอกสารไม่ครบ (รอลูกค้านำเอกสารมา)'}
          onClose={closeModal}
        >
          <form action={updateDocumentReviewDecisionAction} className="space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <input
              name="decision"
              type="hidden"
              value={activeAction === 'DOC_INCOMPLETE_COLLECT_ON_SITE' ? 'INCOMPLETE_COLLECT_ON_SITE' : 'INCOMPLETE_WAIT_CUSTOMER'}
            />
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="incomplete_docs_note">หมายเหตุเอกสารขาด</label>
              <textarea className="input min-h-24" id="incomplete_docs_note" name="incomplete_docs_note" required />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'CONFIRM_DOCS_RECEIVED' ? (
        <Modal title="ยืนยันว่าได้รับเอกสารครบแล้ว" onClose={closeModal}>
          <form action={confirmDocumentsReceivedFromCustomerAction} className="space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <p className="text-sm text-slate-600">หลังยืนยันเอกสาร งานจะกลับไปสถานะ “พร้อมนัดสำรวจ” และยังไม่เริ่มสำรวจทันที</p>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'SCHEDULE_SURVEY' || activeAction === 'EDIT_SURVEY_DATE' ? (
        <Modal title={activeAction === 'SCHEDULE_SURVEY' ? 'กำหนดวันสำรวจ' : 'แก้ไขวันนัดสำรวจ'} onClose={closeModal}>
          <form action={updateSurveyScheduleAction} className="space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="survey_date_current">วันนัดสำรวจล่าสุด</label>
              <input className="input" id="survey_date_current" name="survey_date_current" required type="date" />
            </div>
            {activeAction === 'EDIT_SURVEY_DATE' ? (
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="survey_reschedule_reason">เหตุผลการเลื่อนนัด</label>
                <textarea className="input min-h-24" id="survey_reschedule_reason" name="survey_reschedule_reason" required />
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">บันทึกวันนัด</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'START_SURVEY' ? (
        <Modal title="ยืนยันรับงานและเริ่มสำรวจ" onClose={closeModal}>
          <form action={startSurveyAction}>
            <input name="request_id" type="hidden" value={requestId} />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'COMPLETE_SURVEY' ? (
        <Modal title="ยืนยันสำรวจเสร็จ" onClose={closeModal}>
          <form action={completeSurveyAction} className="space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="survey_note">หมายเหตุ (ถ้ามี)</label>
              <textarea className="input min-h-24" id="survey_note" name="survey_note" />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'CONFIRM_ON_SITE_DOCS_COMPLETE' ? (
        <Modal title="ยืนยันเอกสารครบแล้วหลังสำรวจ" onClose={closeModal}>
          <form action={confirmOnSiteDocumentsCompleteAction}>
            <input name="request_id" type="hidden" value={requestId} />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'ISSUE_BILL' ? (
        <Modal title="ออกใบแจ้งหนี้" onClose={closeModal}>
          <form action={issueBillingAction} className="space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <input className="input" min="0.01" name="billing_amount" placeholder="จำนวนเงิน" required step="0.01" type="number" />
            <input className="input" name="billed_by" placeholder="ออกโดย" required type="text" />
            <textarea className="input min-h-24" name="billing_note" placeholder="หมายเหตุ (ถ้ามี)" />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยันออกใบแจ้งหนี้</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'SURVEYOR_SIGN' ? (
        <Modal title="เซ็นรับรองใบแจ้งหนี้" onClose={closeModal}>
          <form action={confirmBillingSurveyorSignAction} className="space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <input className="input" name="invoice_signed_by" placeholder="ผู้เซ็นรับรอง" required type="text" />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'CONFIRM_PAYMENT' ? (
        <Modal title="ยืนยันรับชำระเงิน" onClose={closeModal}>
          <form action={confirmPaymentReceivedAction} className="space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <input className="input" name="paid_by" placeholder="รับชำระโดย" required type="text" />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'MANAGER_APPROVE' ? (
        <Modal title="ผู้จัดการอนุมัติปิดงาน" onClose={closeModal}>
          <form action={approveManagerReviewAction}>
            <input name="request_id" type="hidden" value={requestId} />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยันอนุมัติ</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
