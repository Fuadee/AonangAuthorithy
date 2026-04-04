'use client';

import { FormEvent, MouseEvent, ReactNode, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  approveFixFromPhotoAction,
  approveManagerReviewAction,
  completeSurveyAction,
  completeLayoutDrawingAction,
  confirmDocumentsReceivedFromCustomerAction,
  markCoordinatedWithConstructionAction,
  markExpansionBillIssuedAction,
  markKrabiDocumentFixCompletedAction,
  markKrabiEstimationCompletedAction,
  markKrabiInProgressAction,
  markKrabiNeedsDocumentFixAction,
  markSentToKrabiAction,
  markSurveyPassedAction,
  moveToResurveyAction,
  markDocumentReadyAction,
  rejectFixPhotoAndRequireResurveyAction,
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
  SURVEY_PASS: markSurveyPassedAction,
  REPORT_CUSTOMER_FIX: reportCustomerFixAction,
  SCHEDULE_RESURVEY: moveToResurveyAction,
  PHOTO_APPROVE: approveFixFromPhotoAction,
  PHOTO_REJECT_TO_RESURVEY: rejectFixPhotoAndRequireResurveyAction,
  MANAGER_APPROVE: approveManagerReviewAction,
  LAYOUT_DRAWING_DONE: completeLayoutDrawingAction,
  MARK_DOCUMENT_READY: markDocumentReadyAction,
  DISPATCHED_TO_KRABI: markSentToKrabiAction,
  KRABI_ACCEPT_AND_START: markKrabiInProgressAction,
  KRABI_RETURN_FOR_FIX: markKrabiNeedsDocumentFixAction,
  KRABI_FIX_COMPLETED: markKrabiDocumentFixCompletedAction,
  KRABI_ESTIMATION_COMPLETED: markKrabiEstimationCompletedAction,
  KRABI_BILL_ISSUED: markExpansionBillIssuedAction,
  COORDINATED_WITH_CONSTRUCTION: markCoordinatedWithConstructionAction
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

export function WorkflowActionModal({ actionKey, requestId, onClose, currentStatus, stayOnQueue = false }: WorkflowActionModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setSubmitError(null);
  }, [actionKey]);

  if (!actionKey) {
    return null;
  }

  const onSubmitWorkflowAction = (submitActionKey: WorkflowActionKey) => (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setSubmitError(null);
    const formData = new FormData(event.currentTarget);
    const executor = ACTION_EXECUTORS[submitActionKey];

    if (!executor) {
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
        const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด';
        setSubmitError(message || 'ไม่สามารถบันทึกรายการได้ กรุณาลองใหม่อีกครั้ง');
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
            <button className="btn-secondary" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
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
            <button className="btn-secondary" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
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
            <button className="btn-secondary" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
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
            <button className="btn-secondary" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
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
            <button className="btn-secondary" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
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
            <button className="btn-secondary" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
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
            <button className="btn-secondary" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
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
            <button className="btn-secondary" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
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
            <button className="btn-secondary" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
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
            <button className="btn-secondary" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
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
            <button className="btn-secondary" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยันอนุมัติ'}</button>
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
            <button className="btn-secondary" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'MARK_DOCUMENT_READY') {
    return (
      <ModalShell title="ยืนยันจัดเตรียมเอกสารเสร็จ" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('MARK_DOCUMENT_READY')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          <p className="text-sm text-slate-600">หลังยืนยัน ระบบจะเปลี่ยนเป็นรอรอบส่งถัดไปอัตโนมัติ</p>
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยันจัดเตรียมเสร็จ'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'DISPATCHED_TO_KRABI') {
    return (
      <ModalShell title="บันทึกการส่งเอกสารไปกระบี่" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('DISPATCHED_TO_KRABI')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="dispatcher_name">ผู้ส่งเอกสาร</label>
            <input className="input" disabled={isPending} id="dispatcher_name" name="dispatcher_name" required />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยันส่งเอกสารแล้ว'}</button>
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
            <button className="btn-secondary" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'KRABI_RETURN_FOR_FIX') {
    return (
      <ModalShell title="ส่งกลับให้อ่าวนางแก้ไขเอกสาร" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('KRABI_RETURN_FOR_FIX')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="krabi_incomplete_docs_note">เหตุผลที่ส่งกลับ</label>
            <textarea className="input min-h-24" disabled={isPending} id="krabi_incomplete_docs_note" name="incomplete_docs_note" required />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยันส่งกลับ'}</button>
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
            <button className="btn-secondary" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
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
            <button className="btn-secondary" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
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
            <button className="btn-secondary" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'COORDINATED_WITH_CONSTRUCTION') {
    return (
      <ModalShell title="ยืนยันว่าประสานงานแผนกก่อสร้างแล้ว" onClose={onClose}>
        <form className="space-y-3" onSubmit={onSubmitWorkflowAction('COORDINATED_WITH_CONSTRUCTION')}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          {submitError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" disabled={isPending} type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" disabled={isPending} type="submit">{isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  return null;
}
