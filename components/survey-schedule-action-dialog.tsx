'use client';

import { MouseEvent, ReactNode } from 'react';
import { updateSurveyScheduleAction } from '@/app/actions';

type SurveyScheduleActionDialogProps = {
  actionKey: 'SCHEDULE_SURVEY' | 'EDIT_SURVEY_DATE' | null;
  requestId: string;
  onClose: () => void;
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

export function SurveyScheduleActionDialog({ actionKey, requestId, onClose }: SurveyScheduleActionDialogProps) {
  if (!actionKey) {
    return null;
  }

  return (
    <Modal title={actionKey === 'SCHEDULE_SURVEY' ? 'กำหนดวันสำรวจ' : 'แก้ไขวันนัดสำรวจ'} onClose={onClose}>
      <form action={updateSurveyScheduleAction} className="space-y-3">
        <input name="request_id" type="hidden" value={requestId} />
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="survey_date_current">
            วันนัดสำรวจล่าสุด
          </label>
          <input className="input" id="survey_date_current" name="survey_date_current" required type="date" />
        </div>
        {actionKey === 'EDIT_SURVEY_DATE' ? (
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="survey_reschedule_reason">
              เหตุผลการเลื่อนนัด
            </label>
            <textarea className="input min-h-24" id="survey_reschedule_reason" name="survey_reschedule_reason" required />
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" type="button" onClick={onClose}>
            ยกเลิก
          </button>
          <button className="btn-primary" type="submit">
            บันทึกวันนัด
          </button>
        </div>
      </form>
    </Modal>
  );
}
