'use client';

import { MouseEvent, ReactNode, useState } from 'react';
import {
  approveFixFromPhotoAction,
  approveManagerReviewAction,
  completeLayoutDrawingAction,
  markKrabiEstimationCompletedAction,
  markExpansionBillIssuedAction,
  markKrabiDocumentFixCompletedAction,
  markKrabiInProgressAction,
  markKrabiNeedsDocumentFixAction,
  markSentToKrabiAction,
  markCoordinatedWithConstructionAction,
  confirmBillingSurveyorSignAction,
  confirmDocumentsReceivedFromCustomerAction,
  confirmPaymentReceivedAction,
  completeSurveyAction,
  issueBillingAction,
  markSurveyFailedAction,
  markSurveyPassedAction,
  moveToResurveyAction,
  rejectFixPhotoAndRequireResurveyAction,
  reportCustomerFixAction,
  startSurveyAction,
  queueForKrabiDispatchAction,
  updateSurveyScheduleAction,
  updateDocumentReviewDecisionAction
} from '@/app/actions';
import { getWorkflowActionLabel, WorkflowActionKey } from '@/lib/requests/workflow-action-config';
import { RequestStatus, RequestType } from '@/lib/requests/types';

type MeterWorkflowActionsProps = {
  requestId: string;
  requestType: RequestType;
  currentStatus: RequestStatus;
  isInvoiceSigned: boolean;
  isPaid: boolean;
  hasCurrentSurveyDate: boolean;
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
  isInvoiceSigned,
  isPaid,
  hasCurrentSurveyDate
}: MeterWorkflowActionsProps) {
  const [activeAction, setActiveAction] = useState<MeterAction | null>(null);

  const closeModal = () => setActiveAction(null);

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
      <div className="flex flex-wrap gap-2">
        {currentStatus === 'WAIT_DOCUMENT_REVIEW' ? (
          <>
            <button className="btn-primary" type="button" onClick={() => setActiveAction('DOC_COMPLETE')}>
              {getWorkflowActionLabel('DOC_COMPLETE')}
            </button>
            <button className="btn-secondary" type="button" onClick={() => setActiveAction('DOC_INCOMPLETE_COLLECT_ON_SITE')}>
              {getWorkflowActionLabel('DOC_INCOMPLETE_COLLECT_ON_SITE')}
            </button>
            <button className="btn-secondary" type="button" onClick={() => setActiveAction('DOC_INCOMPLETE_WAIT_CUSTOMER')}>
              {getWorkflowActionLabel('DOC_INCOMPLETE_WAIT_CUSTOMER')}
            </button>
          </>
        ) : null}

        {currentStatus === 'WAIT_DOCUMENT_FROM_CUSTOMER' ? (
          <button className="btn-primary" type="button" onClick={() => setActiveAction('CONFIRM_DOCS_RECEIVED')}>
            {getWorkflowActionLabel('CONFIRM_DOCS_RECEIVED')}
          </button>
        ) : null}

        {currentStatus === 'READY_FOR_SURVEY' ? (
          <>
            {!hasCurrentSurveyDate ? (
              <button className="btn-primary" type="button" onClick={() => setActiveAction('SCHEDULE_SURVEY')}>
                {getWorkflowActionLabel('SCHEDULE_SURVEY')}
              </button>
            ) : (
              <>
                <button className="btn-primary" type="button" onClick={() => setActiveAction('START_SURVEY')}>
                  {getWorkflowActionLabel('START_SURVEY')}
                </button>
                <button className="btn-secondary" type="button" onClick={() => setActiveAction('EDIT_SURVEY_DATE')}>
                  {getWorkflowActionLabel('EDIT_SURVEY_DATE')}
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
                  {getWorkflowActionLabel('SURVEY_PASS')}
                </button>
                <button className="btn-secondary" type="button" onClick={() => setActiveAction('SURVEY_FAIL')}>
                  {getWorkflowActionLabel('SURVEY_FAIL')}
                </button>
              </>
            ) : (
              <button className="btn-primary" type="button" onClick={() => setActiveAction('COMPLETE_SURVEY')}>
                {getWorkflowActionLabel('COMPLETE_SURVEY')}
              </button>
            )}
          </>
        ) : null}

        {currentStatus === 'WAIT_CUSTOMER_FIX' ? (
          <>
            <button className="btn-primary" type="button" onClick={() => setActiveAction('REPORT_CUSTOMER_FIX')}>
              {getWorkflowActionLabel('REPORT_CUSTOMER_FIX')}
            </button>
            <button className="btn-secondary" type="button" onClick={() => setActiveAction('SCHEDULE_RESURVEY')}>
              {getWorkflowActionLabel('SCHEDULE_RESURVEY')}
            </button>
          </>
        ) : null}

        {currentStatus === 'WAIT_FIX_REVIEW' ? (
          <>
            <button className="btn-primary" type="button" onClick={() => setActiveAction('PHOTO_APPROVE')}>
              {getWorkflowActionLabel('PHOTO_APPROVE')}
            </button>
            <button className="btn-secondary" type="button" onClick={() => setActiveAction('PHOTO_REJECT_TO_RESURVEY')}>
              {getWorkflowActionLabel('PHOTO_REJECT_TO_RESURVEY')}
            </button>
          </>
        ) : null}

        {currentStatus === 'READY_FOR_RESURVEY' ? (
          <>
            <button className="btn-primary" type="button" onClick={() => setActiveAction('START_SURVEY')}>
              {getWorkflowActionLabel('START_SURVEY')}
            </button>
            <button className="btn-secondary" type="button" onClick={() => setActiveAction('EDIT_SURVEY_DATE')}>
              {getWorkflowActionLabel('EDIT_SURVEY_DATE')}
            </button>
          </>
        ) : null}

        {currentStatus === 'WAIT_BILLING' ? (
          <button className="btn-primary" type="button" onClick={() => setActiveAction('ISSUE_BILL')}>
            {getWorkflowActionLabel('ISSUE_BILL')}
          </button>
        ) : null}

        {currentStatus === 'WAIT_ACTION_CONFIRMATION' ? (
          <>
            <button className="btn-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={isInvoiceSigned} type="button" onClick={() => setActiveAction('SURVEYOR_SIGN')}>
              {isInvoiceSigned ? 'เซ็นใบแจ้งหนี้แล้ว' : getWorkflowActionLabel('SURVEYOR_SIGN')}
            </button>
            <button className="btn-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={isPaid} type="button" onClick={() => setActiveAction('CONFIRM_PAYMENT')}>
              {isPaid ? 'ชำระเงินแล้ว' : getWorkflowActionLabel('CONFIRM_PAYMENT')}
            </button>
          </>
        ) : null}

        {currentStatus === 'WAIT_MANAGER_REVIEW' ? (
          <button className="btn-primary" type="button" onClick={() => setActiveAction('MANAGER_APPROVE')}>
            {getWorkflowActionLabel('MANAGER_APPROVE')}
          </button>
        ) : null}

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

      {activeAction === 'REPORT_CUSTOMER_FIX' ? (
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

      {activeAction === 'PHOTO_REJECT_TO_RESURVEY' ? (
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
