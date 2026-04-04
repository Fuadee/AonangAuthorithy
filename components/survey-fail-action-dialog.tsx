'use client';

import { MouseEvent, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { markSurveyFailedAction } from '@/app/actions';

type SurveyFailActionDialogProps = {
  open: boolean;
  requestId: string;
  onClose: () => void;
  stayOnQueue?: boolean;
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
        <h4 className="text-lg font-semibold text-slate-900">บันทึกผลสำรวจไม่ผ่าน</h4>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function SurveyFailActionDialog({ open, requestId, onClose, stayOnQueue = false }: SurveyFailActionDialogProps) {
  const router = useRouter();
  if (!open) {
    return null;
  }


  const handleQueueSubmit = () => {
    if (!stayOnQueue) {
      return;
    }

    window.setTimeout(() => {
      onClose();
      router.refresh();
    }, 0);
  };

  return (
    <Modal title="บันทึกผลสำรวจไม่ผ่าน" onClose={onClose}>
      <form action={markSurveyFailedAction} className="space-y-3" onSubmitCapture={handleQueueSubmit}>
        <input name="request_id" type="hidden" value={requestId} />
        {stayOnQueue ? <input name="stay_on_queue" type="hidden" value="1" /> : null}
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="customer_fix_note">
            รายการที่ต้องแก้ (จำเป็น)
          </label>
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
          <label className="text-sm font-medium text-slate-700" htmlFor="survey_note_fail">
            หมายเหตุเพิ่มเติม
          </label>
          <textarea className="input min-h-24" id="survey_note_fail" name="survey_note" />
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" type="button" onClick={onClose}>
            ยกเลิก
          </button>
          <button className="btn-primary" type="submit">
            ยืนยัน
          </button>
        </div>
      </form>
    </Modal>
  );
}
