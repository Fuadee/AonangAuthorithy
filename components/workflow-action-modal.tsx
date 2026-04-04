'use client';

import { MouseEvent, ReactNode } from 'react';
import {
  approveFixFromPhotoAction,
  approveManagerReviewAction,
  completeSurveyAction,
  confirmDocumentsReceivedFromCustomerAction,
  markSurveyPassedAction,
  moveToResurveyAction,
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
  if (!actionKey) {
    return null;
  }

  if (actionKey === 'DOC_COMPLETE') {
    return (
      <ModalShell title="ยืนยันเอกสารครบ" onClose={onClose}>
        <form action={updateDocumentReviewDecisionAction} className="space-y-3">
          <input name="request_id" type="hidden" value={requestId} />
          <input name="decision" type="hidden" value="COMPLETE" />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" type="submit">ยืนยัน</button>
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
        <form action={updateDocumentReviewDecisionAction} className="space-y-3">
          <input name="request_id" type="hidden" value={requestId} />
          <input name="decision" type="hidden" value={isCollectOnSite ? 'INCOMPLETE_COLLECT_ON_SITE' : 'INCOMPLETE_WAIT_CUSTOMER'} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="incomplete_docs_note">หมายเหตุเอกสารขาด</label>
            <textarea className="input min-h-24" id="incomplete_docs_note" name="incomplete_docs_note" required />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" type="submit">ยืนยัน</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'CONFIRM_DOCS_RECEIVED') {
    return (
      <ModalShell title="ยืนยันว่าได้รับเอกสารครบแล้ว" onClose={onClose}>
        <form action={confirmDocumentsReceivedFromCustomerAction} className="space-y-3">
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          <p className="text-sm text-slate-600">หลังยืนยันเอกสาร งานจะกลับไปสถานะ “พร้อมนัดสำรวจ” และยังไม่เริ่มสำรวจทันที</p>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" type="submit">ยืนยัน</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'START_SURVEY') {
    return (
      <ModalShell title={currentStatus === 'READY_FOR_RESURVEY' ? 'ยืนยันออกตรวจซ้ำหน้างาน' : 'ยืนยันรับงานและเริ่มสำรวจ'} onClose={onClose}>
        <form action={startSurveyAction}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" type="submit">ยืนยัน</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'COMPLETE_SURVEY') {
    return (
      <ModalShell title="ยืนยันสำรวจเสร็จ" onClose={onClose}>
        <form action={completeSurveyAction} className="space-y-3">
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="survey_note_complete">หมายเหตุ (ถ้ามี)</label>
            <textarea className="input min-h-24" id="survey_note_complete" name="survey_note" />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" type="submit">ยืนยัน</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'SURVEY_PASS') {
    return (
      <ModalShell title="ยืนยันสำรวจผ่าน" onClose={onClose}>
        <form action={markSurveyPassedAction} className="space-y-3">
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="survey_note">หมายเหตุ (ถ้ามี)</label>
            <textarea className="input min-h-24" id="survey_note" name="survey_note" />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" type="submit">ยืนยัน</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'REPORT_CUSTOMER_FIX') {
    return (
      <ModalShell title="ผู้ใช้ไฟแจ้งว่าแก้ไขแล้ว" onClose={onClose}>
        <form action={reportCustomerFixAction} className="space-y-3">
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="customer_fix_note_confirm">หมายเหตุจากผู้ใช้ไฟ (ถ้ามี)</label>
            <textarea className="input min-h-24" id="customer_fix_note_confirm" name="customer_fix_note" />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" type="submit">ยืนยัน</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'SCHEDULE_RESURVEY') {
    return (
      <ModalShell title="ยืนยันนัดตรวจซ้ำ" onClose={onClose}>
        <form action={moveToResurveyAction}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" type="submit">ยืนยัน</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'PHOTO_APPROVE') {
    return (
      <ModalShell title="อนุมัติผ่านจากรูป" onClose={onClose}>
        <form action={approveFixFromPhotoAction} className="space-y-3">
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          <input className="input" name="photo_reviewed_by" placeholder="ผู้ตรวจรูป" required type="text" />
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" type="submit">ยืนยัน</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'PHOTO_REJECT_TO_RESURVEY') {
    return (
      <ModalShell title="รูปยังไม่พอ ต้องตรวจซ้ำ" onClose={onClose}>
        <form action={rejectFixPhotoAndRequireResurveyAction} className="space-y-3">
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          <input className="input" name="photo_reviewed_by" placeholder="ผู้ตรวจรูป" required type="text" />
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" type="submit">ยืนยัน</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  if (actionKey === 'MANAGER_APPROVE') {
    return (
      <ModalShell title="ผู้จัดการอนุมัติปิดงาน" onClose={onClose}>
        <form action={approveManagerReviewAction}>
          <input name="request_id" type="hidden" value={requestId} />
          <QueueStayInput stayOnQueue={stayOnQueue} />
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" type="button" onClick={onClose}>ยกเลิก</button>
            <button className="btn-primary" type="submit">ยืนยันอนุมัติ</button>
          </div>
        </form>
      </ModalShell>
    );
  }

  return null;
}
