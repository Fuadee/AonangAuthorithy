'use client';

import { FormEvent, MouseEvent, ReactNode, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  approveFixFromPhotoAction,
  approveAonangManagerFinalAction,
  approveAonangManagerPreKrabiAction,
  approveManagerOverloadForwardAction,
  approveManagerReviewAction,
  completeSurveyAction,
  completeLayoutDrawingAction,
  completeThreePhaseDesignEstimateAction,
  completeThreePhaseInspectionAction,
  completeThreePhaseInstallationAction,
  confirmDocumentsReceivedFromCustomerAction,
  confirmPaymentReceivedAction,
  confirmThreePhasePaymentAction,
  forwardThreePhaseToExpansionAction,
  issueBillingAction,
  issueThreePhaseBillingAction,
  markCoordinatedWithConstructionAction,
  markExpansionBillIssuedAction,
  markKrabiDocumentFixCompletedAction,
  markKrabiEstimationCompletedAction,
  markKrabiInProgressAction,
  markKrabiNeedsDocumentFixAction,
  markSentToKrabiAction,
  markSurveyPassedAction,
  markThreePhaseCapabilitySupportedAction,
  moveToFinalManagerApprovalAction,
  moveToResurveyAction,
  rejectFixPhotoAndRequireResurveyAction,
  markEligibilityFailedForMeterAction,
  markEligibilityPassedForMeterAction,
  markKrabiApprovedForMeterAction,
  markKrabiRejectedForMeterAction,
  moveToWaitKrabiApprovalAction,
  receiveFromKrabiForMeterAction,
  resendToKrabiForMeterAction,
  returnRequestForResurveyAction,
  restartReturnedResurveyAction,
  sendToEligibilityReviewForMeterAction,
  startDocumentFixForMeterAction,
  reportCustomerFixAction,
  startSurveyAction,
  updateDocumentReviewDecisionAction
} from '@/app/actions';
import { WorkflowActionKey } from '@/lib/requests/workflow-action-config';
import { RequestStatus } from '@/lib/requests/types';

type WorkflowActionModalProps = {
  actionKey: WorkflowActionKey | null;
  requestId: string;
  onClose: () => void;
  currentStatus?: RequestStatus;
  stayOnQueue?: boolean;
};

type ActionExecutor = (formData: FormData) => Promise<void>;

const ACTION_EXECUTORS: Partial<Record<WorkflowActionKey, ActionExecutor>> = {
  CONFIRM_DOCS_RECEIVED: confirmDocumentsReceivedFromCustomerAction,
  START_SURVEY: startSurveyAction,
  COMPLETE_SURVEY: completeSurveyAction,
  ISSUE_BILL: issueBillingAction,
  CONFIRM_PAYMENT: confirmPaymentReceivedAction,
  SURVEY_PASS: markSurveyPassedAction,
  REPORT_CUSTOMER_FIX: reportCustomerFixAction,
  SCHEDULE_RESURVEY: moveToResurveyAction,
  PHOTO_APPROVE: approveFixFromPhotoAction,
  PHOTO_REJECT_TO_RESURVEY: rejectFixPhotoAndRequireResurveyAction,
  MANAGER_APPROVE: approveManagerReviewAction,
  MANAGER_RETURN_FOR_RESURVEY: returnRequestForResurveyAction,
  RESTART_RETURNED_RESURVEY: restartReturnedResurveyAction,
  LAYOUT_DRAWING_DONE: completeLayoutDrawingAction,
  DISPATCHED_TO_KRABI: markSentToKrabiAction,
  KRABI_ACCEPT_AND_START: markKrabiInProgressAction,
  KRABI_RETURN_FOR_FIX: markKrabiNeedsDocumentFixAction,
  KRABI_FIX_COMPLETED: markKrabiDocumentFixCompletedAction,
  KRABI_ESTIMATION_COMPLETED: markKrabiEstimationCompletedAction,
  KRABI_BILL_ISSUED: markExpansionBillIssuedAction,
  COORDINATED_WITH_CONSTRUCTION: markCoordinatedWithConstructionAction,
  THREE_PHASE_CAPABLE: markThreePhaseCapabilitySupportedAction,
  THREE_PHASE_NEEDS_EXPANSION: forwardThreePhaseToExpansionAction,
  COMPLETE_DESIGN_ESTIMATE: completeThreePhaseDesignEstimateAction,
  ISSUE_3PHASE_BILL: issueThreePhaseBillingAction,
  CONFIRM_3PHASE_PAYMENT: confirmThreePhasePaymentAction,
  COMPLETE_INSTALLATION: completeThreePhaseInstallationAction,
  COMPLETE_INSPECTION: completeThreePhaseInspectionAction,
  APPROVE_PRE_KRABI: approveAonangManagerPreKrabiAction,
  MOVE_TO_WAIT_KRABI_APPROVAL: moveToWaitKrabiApprovalAction,
  MARK_KRABI_APPROVED: markKrabiApprovedForMeterAction,
  MARK_KRABI_REJECTED: markKrabiRejectedForMeterAction,
  START_DOCUMENT_FIX: startDocumentFixForMeterAction,
  RESENT_TO_KRABI: resendToKrabiForMeterAction,
  RECEIVE_FROM_KRABI: receiveFromKrabiForMeterAction,
  SEND_TO_ELIGIBILITY_REVIEW: sendToEligibilityReviewForMeterAction,
  ELIGIBILITY_PASS: markEligibilityPassedForMeterAction,
  ELIGIBILITY_FAIL: markEligibilityFailedForMeterAction,
  MOVE_TO_FINAL_MANAGER_APPROVAL: moveToFinalManagerApprovalAction,
  FINAL_MANAGER_APPROVE: approveAonangManagerFinalAction,
  COMPLETE_WORK: approveAonangManagerFinalAction
  ,
  MANAGER_APPROVE_OVERLOAD_FORWARD: approveManagerOverloadForwardAction
};

function ModalShell({ children, title, onClose }: { children: ReactNode; title: string; onClose: () => void }) {
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

function QueueStayInput({ stayOnQueue }: { stayOnQueue: boolean }) {
  if (!stayOnQueue) {
    return null;
  }

  return <input name="stay_on_queue" type="hidden" value="1" />;
}

function getActionTitle(actionKey: WorkflowActionKey): string {
  const map: Partial<Record<WorkflowActionKey, string>> = {
    THREE_PHASE_CAPABLE: 'ยืนยันว่าระบบรองรับ 3 เฟส',
    THREE_PHASE_NEEDS_EXPANSION: 'ยืนยันส่งต่องานขยายเขต',
    COMPLETE_DESIGN_ESTIMATE: 'ยืนยันออกแบบ / ประเมินเสร็จ',
    COMPLETE_INSTALLATION: 'ยืนยันติดตั้งเปลี่ยนมิเตอร์เสร็จ',
    COMPLETE_INSPECTION: 'ยืนยันตรวจสอบหลังติดตั้งผ่าน',
    APPROVE_PRE_KRABI: 'อนุมัติก่อนส่งกระบี่',
    MOVE_TO_WAIT_KRABI_APPROVAL: 'ส่งเอกสารไปกระบี่',
    MARK_KRABI_APPROVED: 'บันทึกว่ากระบี่อนุมัติ',
    START_DOCUMENT_FIX: 'ยืนยันเริ่มแก้ไขเอกสาร',
    RESENT_TO_KRABI: 'ยืนยันส่งเอกสารไปกระบี่ใหม่',
    RECEIVE_FROM_KRABI: 'ยืนยันรับเอกสารกลับจากกระบี่',
    SEND_TO_ELIGIBILITY_REVIEW: 'ตรวจสอบสิทธิ์',
    ELIGIBILITY_PASS: 'ยืนยันผลตรวจสอบสิทธิ์ผ่าน',
    ELIGIBILITY_FAIL: 'ยืนยันผลตรวจสอบสิทธิ์ไม่ผ่าน',
    MOVE_TO_FINAL_MANAGER_APPROVAL: 'ส่งให้ผู้จัดการอ่าวนางอนุมัติรอบสุดท้าย',
    FINAL_MANAGER_APPROVE: 'อนุมัติปิดงาน',
    COMPLETE_WORK: 'ปิดงานเสร็จสิ้น'
    ,
    MANAGER_APPROVE_OVERLOAD_FORWARD: 'อนุมัติบันทึกให้กระบี่ปรับปรุงระบบจำหน่าย',
    MANAGER_RETURN_FOR_RESURVEY: 'ส่งกลับให้สำรวจตรวจสอบใหม่',
    RESTART_RETURNED_RESURVEY: 'เริ่มงานสำรวจรอบใหม่'
  };
  return map[actionKey] ?? 'ยืนยันการทำรายการ';
}

const DANGER_MODAL_ACTIONS: WorkflowActionKey[] = [
  'KRABI_RETURN_FOR_FIX',
  'MARK_KRABI_REJECTED',
  'MANAGER_RETURN_FOR_RESURVEY'
];

const WARNING_MODAL_ACTIONS: WorkflowActionKey[] = [
  'DOC_INCOMPLETE_COLLECT_ON_SITE',
  'DOC_INCOMPLETE_WAIT_CUSTOMER',
  'THREE_PHASE_NEEDS_EXPANSION',
  'START_DOCUMENT_FIX',
  'KRABI_FIX_COMPLETED',
  'MANAGER_APPROVE_OVERLOAD_FORWARD'
];

const SUCCESS_MODAL_ACTIONS: WorkflowActionKey[] = [
  'DOC_COMPLETE',
  'SURVEY_PASS',
  'PHOTO_APPROVE',
  'THREE_PHASE_CAPABLE',
  'COMPLETE_SURVEY',
  'MARK_KRABI_APPROVED',
  'ELIGIBILITY_PASS',
  'FINAL_MANAGER_APPROVE',
  'COMPLETE_WORK',
  'COORDINATED_WITH_CONSTRUCTION',
  'KRABI_ESTIMATION_COMPLETED',
  'KRABI_BILL_ISSUED'
];

const INFO_MODAL_ACTIONS: WorkflowActionKey[] = [
  'CONFIRM_DOCS_RECEIVED',
  'REPORT_CUSTOMER_FIX',
  'RECEIVE_FROM_KRABI'
];

function getModalSubmitButtonClass(actionKey: WorkflowActionKey): string {
  if (DANGER_MODAL_ACTIONS.includes(actionKey)) return 'btn-flow-danger';
  if (WARNING_MODAL_ACTIONS.includes(actionKey)) return 'btn-flow-warning';
  if (SUCCESS_MODAL_ACTIONS.includes(actionKey)) return 'btn-flow-success';
  if (INFO_MODAL_ACTIONS.includes(actionKey)) return 'btn-flow-info';
  return 'btn-flow-primary';
}

export function WorkflowActionModal({ actionKey, requestId, onClose, currentStatus, stayOnQueue = false }: WorkflowActionModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [krabiRejectReason, setKrabiRejectReason] = useState('');
  const [krabiReferenceNo, setKrabiReferenceNo] = useState('');
  const submissionLockedRef = useRef(false);

  useEffect(() => {
    setSubmitError(null);
    setKrabiRejectReason('');
    setKrabiReferenceNo('');
  }, [actionKey]);

  if (!actionKey) {
    return null;
  }

  const onSubmitWorkflowAction = (submitActionKey: WorkflowActionKey) => (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (submissionLockedRef.current || isPending) {
      return;
    }
    submissionLockedRef.current = true;
    setSubmitError(null);
    const formData = new FormData(event.currentTarget);
    const executor = ACTION_EXECUTORS[submitActionKey];

    if (!executor) {
      submissionLockedRef.current = false;
      setSubmitError('ไม่พบการทำรายการที่ต้องการ กรุณาลองใหม่อีกครั้ง');
      return;
    }

    startTransition(async () => {
      try {
        await executor(formData);
        setSubmitError(null);
        onClose();
        router.refresh();
      } catch (error) {
        const rawMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด';
        const message = rawMessage.includes('An error occurred in the Server Components render')
          ? 'บันทึกไม่สำเร็จจากฝั่งเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง หรือตรวจสอบสถานะคำร้องล่าสุด'
          : rawMessage;
        setSubmitError(message || 'ไม่สามารถบันทึกรายการได้ กรุณาลองใหม่อีกครั้ง');
      } finally {
        submissionLockedRef.current = false;
      }
    });
  };

  const mapDocumentReviewError = (message: string): { userMessage: string; shouldRefresh: boolean } => {
    if (message.includes('บันทึกผลตรวจเอกสารได้เฉพาะงานที่อยู่สถานะรอตรวจเอกสาร')) {
      return {
        userMessage: 'งานนี้ไม่ได้อยู่ในขั้นตอนรอตรวจเอกสารแล้ว กรุณารีเฟรชรายการ',
        shouldRefresh: true
      };
    }

    return {
      userMessage: message || 'ไม่สามารถบันทึกผลตรวจเอกสารได้ กรุณาลองใหม่อีกครั้ง',
      shouldRefresh: false
    };
  };

  const onSubmitDocumentReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await updateDocumentReviewDecisionAction(formData);
        setSubmitError(null);
        onClose();
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด';
        const mapped = mapDocumentReviewError(message);
        setSubmitError(mapped.userMessage);
        if (mapped.shouldRefresh) {
          router.refresh();
        }
      }
    });
  };

  if (actionKey === 'DOC_COMPLETE') {
    return (
      <ModalShell title="ยืนยันเอกสารครบ" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitDocumentReview}>
          <input name="request_id" type="hidden" value={requestId} />
          <input name="decision" type="hidden" value="COMPLETE" />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'DOC_INCOMPLETE_COLLECT_ON_SITE' || actionKey === 'DOC_INCOMPLETE_WAIT_CUSTOMER') {
    const isCollectOnSite = actionKey === 'DOC_INCOMPLETE_COLLECT_ON_SITE';

    return (
      <ModalShell
        title={isCollectOnSite ? 'ระบุว่าเอกสารไม่ครบ (รับเอกสารหน้างาน)' : 'ระบุว่าเอกสารไม่ครบ (รอลูกค้านำเอกสารมา)'}
        onClose={onClose}
      >
        <form className="space-y-3" onSubmit={onSubmitDocumentReview}>
          <input name="request_id" type="hidden" value={requestId} />
          <input name="decision" type="hidden" value={isCollectOnSite ? 'INCOMPLETE_COLLECT_ON_SITE' : 'INCOMPLETE_WAIT_CUSTOMER'} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="incomplete_docs_note">หมายเหตุเอกสารขาด</label>
            <textarea className="input min-h-24" disabled={isPending} id="incomplete_docs_note" name="incomplete_docs_note" required />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'CONFIRM_DOCS_RECEIVED') {
    return (
      <ModalShell title="ยืนยันว่าได้รับเอกสารครบแล้ว" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('CONFIRM_DOCS_RECEIVED')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          <p className="text-sm text-slate-600">หลังยืนยันเอกสาร งานจะกลับไปสถานะ “พร้อมนัดสำรวจ” และยังไม่เริ่มสำรวจทันที</p>
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'START_SURVEY') {
    return (
      <ModalShell title={currentStatus === 'READY_FOR_RESURVEY' ? 'ยืนยันออกตรวจซ้ำหน้างาน' : 'ยืนยันรับงานและเริ่มสำรวจ'} onClose={onClose}>
        <form onSubmit={onSubmitWorkflowAction('START_SURVEY')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          {submitError ? <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'COMPLETE_SURVEY') {
    return (
      <ModalShell title="ยืนยันสำรวจเสร็จ" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('COMPLETE_SURVEY')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="survey_note_complete">หมายเหตุ (ถ้ามี)</label>
            <textarea className="input min-h-24" disabled={isPending} id="survey_note_complete" name="survey_note" />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (
    actionKey === 'THREE_PHASE_CAPABLE' ||
    actionKey === 'THREE_PHASE_NEEDS_EXPANSION' ||
    actionKey === 'COMPLETE_DESIGN_ESTIMATE' ||
    actionKey === 'COMPLETE_INSTALLATION' ||
    actionKey === 'COMPLETE_INSPECTION'
  ) {
    return (
      <ModalShell title={getActionTitle(actionKey)} onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction(actionKey)}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          {actionKey === 'THREE_PHASE_CAPABLE' ? (
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="survey_note_3phase">หมายเหตุ (ถ้ามี)</label>
              <textarea className="input min-h-24" disabled={isPending} id="survey_note_3phase" name="survey_note" />
            </div>
          ) : null}
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }


  if (actionKey === 'ISSUE_BILL') {
    return (
      <ModalShell title="ออกใบแจ้งหนี้" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('ISSUE_BILL')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          <input className="input" name="billed_by" placeholder="ออกโดย" required type="text" />
          <textarea className="input min-h-24" name="billing_note" placeholder="หมายเหตุ (ถ้ามี)" />
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'CONFIRM_PAYMENT') {
    return (
      <ModalShell title="ยืนยันรับชำระเงิน" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('CONFIRM_PAYMENT')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="paid_by">รับชำระโดย</label>
            <input className="input" disabled={isPending} id="paid_by" name="paid_by" required type="text" />
          </div>
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'ISSUE_3PHASE_BILL') {
    return (
      <ModalShell title="ออกใบแจ้งหนี้งานเพิ่มเป็นมิเตอร์ 3 เฟส" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('ISSUE_3PHASE_BILL')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          <input className="input" name="billed_by" placeholder="ออกโดย" required type="text" />
          <textarea className="input min-h-24" name="billing_note" placeholder="หมายเหตุ (ถ้ามี)" />
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'CONFIRM_3PHASE_PAYMENT') {
    return (
      <ModalShell title="ยืนยันรับชำระเงินงานเพิ่มเป็นมิเตอร์ 3 เฟส" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('CONFIRM_3PHASE_PAYMENT')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          <input className="input" name="paid_by" placeholder="รับชำระโดย" required type="text" />
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'SURVEY_PASS') {
    return (
      <ModalShell title="ยืนยันสำรวจผ่าน" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('SURVEY_PASS')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="survey_note">หมายเหตุ (ถ้ามี)</label>
            <textarea className="input min-h-24" disabled={isPending} id="survey_note" name="survey_note" />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'REPORT_CUSTOMER_FIX') {
    return (
      <ModalShell title="ผู้ใช้ไฟแจ้งว่าแก้ไขแล้ว" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('REPORT_CUSTOMER_FIX')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="customer_fix_note_confirm">หมายเหตุจากผู้ใช้ไฟ (ถ้ามี)</label>
            <textarea className="input min-h-24" disabled={isPending} id="customer_fix_note_confirm" name="customer_fix_note" />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'SCHEDULE_RESURVEY') {
    return (
      <ModalShell title="ยืนยันนัดตรวจซ้ำ" onClose={onClose}>
        <form onSubmit={onSubmitWorkflowAction('SCHEDULE_RESURVEY')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          {submitError ? <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'PHOTO_APPROVE') {
    return (
      <ModalShell title="อนุมัติผ่านจากรูป" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('PHOTO_APPROVE')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <input className="input" disabled={isPending} name="photo_reviewed_by" placeholder="ผู้ตรวจรูป" required type="text" />
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'PHOTO_REJECT_TO_RESURVEY') {
    return (
      <ModalShell title="รูปยังไม่พอ ต้องตรวจซ้ำ" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('PHOTO_REJECT_TO_RESURVEY')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <input className="input" disabled={isPending} name="photo_reviewed_by" placeholder="ผู้ตรวจรูป" required type="text" />
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'MANAGER_APPROVE') {
    return (
      <ModalShell title="ผู้จัดการอนุมัติปิดงาน" onClose={onClose}>
        <form onSubmit={onSubmitWorkflowAction('MANAGER_APPROVE')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          {submitError ? <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยันอนุมัติ'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'LAYOUT_DRAWING_DONE') {
    return (
      <ModalShell title="ยืนยันวาดผังเสร็จ" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('LAYOUT_DRAWING_DONE')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="layout_note">หมายเหตุ (ถ้ามี)</label>
            <textarea className="input min-h-24" disabled={isPending} id="layout_note" name="survey_note" />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }


  if (actionKey === 'DISPATCHED_TO_KRABI') {
    return (
      <ModalShell title="บันทึกการส่งให้กระบี่" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('DISPATCHED_TO_KRABI')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="dispatcher_name">ผู้ส่งเอกสาร</label>
            <input className="input" disabled={isPending} id="dispatcher_name" name="dispatcher_name" required />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยันส่งเอกสารแล้ว'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'KRABI_ACCEPT_AND_START') {
    return (
      <ModalShell title="ยืนยันว่าเอกสารครบและกระบี่รับดำเนินการ" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('KRABI_ACCEPT_AND_START')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'KRABI_RETURN_FOR_FIX') {
    const onSubmitKrabiReturnForFix = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setSubmitError(null);
      const formData = new FormData(event.currentTarget);
      const reasonFromState = krabiRejectReason.trim();

      if (reasonFromState) {
        formData.set('reject_reason', reasonFromState);
      }

      startTransition(async () => {
        try {
          await markKrabiNeedsDocumentFixAction(formData);
          setSubmitError(null);
          onClose();
          router.refresh();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด';
          setSubmitError(message || 'ไม่สามารถบันทึกรายการได้ กรุณาลองใหม่อีกครั้ง');
        }
      });
    };

    return (
      <ModalShell title="ส่งกลับให้อ่าวนางแก้ไขเอกสาร" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitKrabiReturnForFix}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="krabi_reject_reason">เหตุผลที่ตีกลับ</label>
            <textarea
              className="input min-h-24"
              disabled={isPending}
              id="krabi_reject_reason"
              name="reject_reason"
              required
              value={krabiRejectReason}
              onChange={(event) => setKrabiRejectReason(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยันส่งกลับ'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'KRABI_FIX_COMPLETED') {
    return (
      <ModalShell title="ยืนยันว่าแก้ไขเอกสารแล้วและพร้อมส่งกระบี่ใหม่" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('KRABI_FIX_COMPLETED')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'KRABI_ESTIMATION_COMPLETED') {
    return (
      <ModalShell title="ยืนยันว่ากระบี่ประมาณการเสร็จแล้ว" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('KRABI_ESTIMATION_COMPLETED')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'KRABI_BILL_ISSUED') {
    return (
      <ModalShell title="ยืนยันว่าออกใบแจ้งหนี้แล้ว" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('KRABI_BILL_ISSUED')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'COORDINATED_WITH_CONSTRUCTION') {
    return (
      <ModalShell title="ยืนยันว่า ผกส.รับเรื่องแล้ว" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('COORDINATED_WITH_CONSTRUCTION')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }



  if (['APPROVE_PRE_KRABI','MOVE_TO_WAIT_KRABI_APPROVAL','MARK_KRABI_APPROVED','START_DOCUMENT_FIX','RESENT_TO_KRABI','RECEIVE_FROM_KRABI','SEND_TO_ELIGIBILITY_REVIEW','ELIGIBILITY_PASS','ELIGIBILITY_FAIL','MOVE_TO_FINAL_MANAGER_APPROVAL','FINAL_MANAGER_APPROVE','COMPLETE_WORK','MANAGER_APPROVE_OVERLOAD_FORWARD'].includes(actionKey)) {
    return (
      <ModalShell title={getActionTitle(actionKey)} onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction(actionKey)}>
          <input name="request_id" type="hidden" value={requestId} />
          {actionKey === 'MANAGER_APPROVE_OVERLOAD_FORWARD' ? <input name="manager_overload_approved_by" type="hidden" value="ผู้จัดการอ่าวนาง" /> : null}
          {actionKey === 'MANAGER_APPROVE_OVERLOAD_FORWARD' ? (
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="workflow-krabi-reference-no">
                เลขที่หนังสือส่งกระบี่
              </label>
              <input
                className="input mt-2"
                id="workflow-krabi-reference-no"
                name="krabi_reference_no"
                placeholder="เช่น กบ.123/2569"
                required
                value={krabiReferenceNo}
                onChange={(event) => setKrabiReferenceNo(event.target.value)}
              />
            </div>
          ) : null}
          <QueueStayInput stayOnQueue={stayOnQueue} />
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'MARK_KRABI_REJECTED') {
    return (
      <ModalShell title="บันทึกว่ากระบี่ตีกลับ" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('MARK_KRABI_REJECTED')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          <textarea className="input min-h-24" name="reject_reason" placeholder="เหตุผลตีกลับ (ถ้ามี)" value={krabiRejectReason} onChange={(event) => setKrabiRejectReason(event.target.value)} />
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'MANAGER_RETURN_FOR_RESURVEY') {
    const checklistOptions = [
      { key: 'METER_SIZE', label: 'ตรวจสอบขนาดมิเตอร์ที่ขอ' },
      { key: 'PHASE_COUNT', label: 'ตรวจสอบจำนวนเฟส' },
      { key: 'ACTUAL_LOAD', label: 'ตรวจสอบโหลดใช้งานจริง' },
      { key: 'INSTALLATION_POINT', label: 'ตรวจสอบจุดติดตั้งหน้างาน' },
      { key: 'CABLE_DISTANCE', label: 'ตรวจสอบระยะสาย / แนวพาด' },
      { key: 'SITE_PHOTOS', label: 'ตรวจสอบรูปถ่ายหน้างาน' },
      { key: 'DOCUMENT_ACCURACY', label: 'ตรวจสอบความถูกต้องของเอกสาร' },
      { key: 'THREE_PHASE_CAPABILITY', label: 'ตรวจสอบว่าระบบรองรับ 3 เฟสจริงหรือไม่' },
      { key: 'EXPANSION_REQUIRED', label: 'ตรวจสอบว่าต้องเข้าขยายเขตหรือไม่' },
      { key: 'OTHER', label: 'อื่น ๆ' }
    ] as const;

    return (
      <ModalShell title="ส่งกลับให้ตรวจสอบใหม่" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('MANAGER_RETURN_FOR_RESURVEY')}>
          <input name="request_id" type="hidden" value={requestId} />
          <input name="manager_returned_by" type="hidden" value="ผู้จัดการอ่าวนาง" />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">หัวข้อที่ต้องตรวจสอบ</legend>
            <div className="grid gap-1">
              {checklistOptions.map((option) => (
                <label key={option.key} className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input name="manager_return_checklist" type="checkbox" value={option.key} />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="manager_return_reason">
              โปรดระบุสิ่งที่ต้องตรวจสอบเพิ่มเติม
            </label>
            <textarea className="input min-h-24" id="manager_return_reason" name="manager_return_reason" />
          </div>
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยันส่งกลับ'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'RESTART_RETURNED_RESURVEY') {
    return (
      <ModalShell title="ตั้งต้นงานสำรวจใหม่" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('RESTART_RETURNED_RESURVEY')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="assigned_surveyor">มอบหมายนักสำรวจรอบใหม่</label>
            <input className="input" id="assigned_surveyor" name="assigned_surveyor" required />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="scheduled_survey_date">วันนัดสำรวจรอบใหม่</label>
            <input className="input" id="scheduled_survey_date" name="scheduled_survey_date" required type="date" />
          </div>
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div className="flex justify-end gap-2">
            <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className={getModalSubmitButtonClass(actionKey)} disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'เริ่มรอบสำรวจใหม่'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  return null;
}
