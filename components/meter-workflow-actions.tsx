'use client';

import { MouseEvent, ReactNode, useState } from 'react';
import {
  approveFixFromPhotoAction,
  approveManagerReviewAction,
  confirmDocumentsReceivedFromCustomerAction,
  confirmPaymentReceivedAction,
  completeSurveyAction,
  confirmBillingSurveyorSignAction,
  issueBillingAction,
  markSurveyFailedAction,
  markSurveyPassedAction,
  moveToResurveyAction,
  rejectFixPhotoAndRequireResurveyAction,
  reportCustomerFixAction,
  startSurveyAction,
  updateSurveyScheduleAction,
  updateDocumentReviewDecisionAction
} from '@/app/actions';
import { RequestStatus, RequestType } from '@/lib/requests/types';

type MeterWorkflowActionsProps = {
  requestId: string;
  requestType: RequestType;
  currentStatus: RequestStatus;
  isInvoiceSigned: boolean;
  isPaid: boolean;
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
  | 'SURVEY_PASS'
  | 'SURVEY_FAIL'
  | 'CUSTOMER_FIXED'
  | 'SCHEDULE_RESURVEY'
  | 'PHOTO_APPROVE'
  | 'PHOTO_REJECT'
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
  SURVEY_PASS: 'สำรวจผ่าน',
  SURVEY_FAIL: 'สำรวจไม่ผ่าน / ให้ผู้ใช้ไฟแก้ไข',
  CUSTOMER_FIXED: 'ผู้ใช้ไฟแจ้งว่าแก้ไขแล้ว',
  SCHEDULE_RESURVEY: 'นัดตรวจซ้ำ',
  PHOTO_APPROVE: 'อนุมัติผ่านจากรูป',
  PHOTO_REJECT: 'รูปยังไม่พอ ต้องตรวจซ้ำ',
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
  requestType,
  currentStatus,
  isInvoiceSigned,
  isPaid,
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
      'WAIT_CUSTOMER_FIX',
      'WAIT_FIX_REVIEW',
      'READY_FOR_RESURVEY',
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
          <>
            {requestType === 'METER' ? (
              <>
                <button className="btn-primary" type="button" onClick={() => setActiveAction('SURVEY_PASS')}>
                  {ACTION_LABELS.SURVEY_PASS}
                </button>
                <button className="btn-secondary" type="button" onClick={() => setActiveAction('SURVEY_FAIL')}>
                  {ACTION_LABELS.SURVEY_FAIL}
                </button>
              </>
            ) : (
              <button className="btn-primary" type="button" onClick={() => setActiveAction('COMPLETE_SURVEY')}>
                {ACTION_LABELS.COMPLETE_SURVEY}
              </button>
            )}
          </>
        ) : null}

        {currentStatus === 'WAIT_CUSTOMER_FIX' ? (
          <>
            <button className="btn-primary" type="button" onClick={() => setActiveAction('CUSTOMER_FIXED')}>
              {ACTION_LABELS.CUSTOMER_FIXED}
            </button>
            <button className="btn-secondary" type="button" onClick={() => setActiveAction('SCHEDULE_RESURVEY')}>
              {ACTION_LABELS.SCHEDULE_RESURVEY}
            </button>
          </>
        ) : null}

        {currentStatus === 'WAIT_FIX_REVIEW' ? (
          <>
            <button className="btn-primary" type="button" onClick={() => setActiveAction('PHOTO_APPROVE')}>
              {ACTION_LABELS.PHOTO_APPROVE}
            </button>
            <button className="btn-secondary" type="button" onClick={() => setActiveAction('PHOTO_REJECT')}>
              {ACTION_LABELS.PHOTO_REJECT}
            </button>
          </>
        ) : null}

        {currentStatus === 'READY_FOR_RESURVEY' ? (
          <>
            <button className="btn-primary" type="button" onClick={() => setActiveAction('START_SURVEY')}>
              ออกตรวจซ้ำ
            </button>
            <button className="btn-secondary" type="button" onClick={() => setActiveAction('EDIT_SURVEY_DATE')}>
              {ACTION_LABELS.EDIT_SURVEY_DATE}
            </button>
          </>
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
        <Modal title={currentStatus === 'READY_FOR_RESURVEY' ? 'ยืนยันออกตรวจซ้ำหน้างาน' : 'ยืนยันรับงานและเริ่มสำรวจ'} onClose={closeModal}>
          <form action={startSurveyAction}>
            <input name="request_id" type="hidden" value={requestId} />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'SURVEY_PASS' ? (
        <Modal title="ยืนยันสำรวจผ่าน" onClose={closeModal}>
          <form action={markSurveyPassedAction} className="space-y-3">
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

      {activeAction === 'COMPLETE_SURVEY' ? (
        <Modal title="ยืนยันสำรวจเสร็จ" onClose={closeModal}>
          <form action={completeSurveyAction} className="space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="survey_note_complete">หมายเหตุ (ถ้ามี)</label>
              <textarea className="input min-h-24" id="survey_note_complete" name="survey_note" />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'SURVEY_FAIL' ? (
        <Modal title="บันทึกผลสำรวจไม่ผ่าน" onClose={closeModal}>
          <form action={markSurveyFailedAction} className="space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="customer_fix_note">รายการที่ต้องแก้ (จำเป็น)</label>
              <textarea className="input min-h-24" id="customer_fix_note" name="customer_fix_note" required />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">วิธีตรวจหลังแก้ไข</p>
              <div className="mt-2 space-y-2 text-sm text-slate-700">
                <label className="flex items-center gap-2">
                  <input defaultChecked name="fix_verification_mode" type="radio" value="PHOTO_OR_RESURVEY" />
                  อนุญาตให้ส่งรูปยืนยัน
                </label>
                <label className="flex items-center gap-2">
                  <input name="fix_verification_mode" type="radio" value="RESURVEY_ONLY" />
                  ต้องตรวจซ้ำหน้างานเท่านั้น
                </label>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="survey_note_fail">หมายเหตุเพิ่มเติม</label>
              <textarea className="input min-h-24" id="survey_note_fail" name="survey_note" />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'CUSTOMER_FIXED' ? (
        <Modal title="ผู้ใช้ไฟแจ้งว่าแก้ไขแล้ว" onClose={closeModal}>
          <form action={reportCustomerFixAction} className="space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="customer_fix_note_confirm">หมายเหตุจากผู้ใช้ไฟ (ถ้ามี)</label>
              <textarea className="input min-h-24" id="customer_fix_note_confirm" name="customer_fix_note" />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'SCHEDULE_RESURVEY' ? (
        <Modal title="ยืนยันนัดตรวจซ้ำ" onClose={closeModal}>
          <form action={moveToResurveyAction}>
            <input name="request_id" type="hidden" value={requestId} />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'PHOTO_APPROVE' ? (
        <Modal title="อนุมัติผ่านจากรูป" onClose={closeModal}>
          <form action={approveFixFromPhotoAction} className="space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <input className="input" name="photo_reviewed_by" placeholder="ผู้ตรวจรูป" required type="text" />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={closeModal}>ยกเลิก</button>
              <button className="btn-primary" type="submit">ยืนยัน</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeAction === 'PHOTO_REJECT' ? (
        <Modal title="รูปยังไม่พอ ต้องตรวจซ้ำ" onClose={closeModal}>
          <form action={rejectFixPhotoAndRequireResurveyAction} className="space-y-3">
            <input name="request_id" type="hidden" value={requestId} />
            <input className="input" name="photo_reviewed_by" placeholder="ผู้ตรวจรูป" required type="text" />
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
