'use client';

import { MouseEvent, ReactNode, useMemo, useState } from 'react';
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
  const [failureType, setFailureType] = useState<'NORMAL_FIX_REQUIRED' | 'OVERLOAD_REPORTED'>('NORMAL_FIX_REQUIRED');
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

  const isOverloadMode = failureType === 'OVERLOAD_REPORTED';
  const submitLabel = useMemo(() => (isOverloadMode ? 'ทำบันทึกต่อผู้จัดการ' : 'ยืนยัน'), [isOverloadMode]);

  return (
    <Modal title="บันทึกผลสำรวจไม่ผ่าน" onClose={onClose}>
      <form action={markSurveyFailedAction} className="space-y-3" onSubmitCapture={handleQueueSubmit}>
        <input name="request_id" type="hidden" value={requestId} />
        <input name="survey_failure_type" type="hidden" value={failureType} />
        <input name="overload_reported_by" type="hidden" value="เจ้าหน้าที่สำรวจ" />
        {stayOnQueue ? <input name="stay_on_queue" type="hidden" value="1" /> : null}
        <div>
          <p className="text-sm font-medium text-slate-700">ประเภทผลการไม่ผ่าน</p>
          <div className="mt-2 space-y-2 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input
                checked={failureType === 'NORMAL_FIX_REQUIRED'}
                name="survey_failure_type_option"
                type="radio"
                value="NORMAL_FIX_REQUIRED"
                onChange={() => setFailureType('NORMAL_FIX_REQUIRED')}
              />
              ต้องแก้ไขตามรายการปกติ
            </label>
            <label className="flex items-center gap-2">
              <input
                checked={failureType === 'OVERLOAD_REPORTED'}
                name="survey_failure_type_option"
                type="radio"
                value="OVERLOAD_REPORTED"
                onChange={() => setFailureType('OVERLOAD_REPORTED')}
              />
              ตรวจสอบแล้วโหลดเกิน
            </label>
          </div>
        </div>
        {isOverloadMode ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            กรณีนี้จะไม่ส่งกลับให้ผู้ใช้ไฟแก้ไข แต่จะส่งบันทึกเข้า queue ผู้จัดการอ่าวนางเพื่ออนุมัติส่งต่อกระบี่
          </div>
        ) : null}
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor={isOverloadMode ? 'overload_report_reason' : 'customer_fix_note'}>
            {isOverloadMode ? 'รายละเอียดเหตุผล/ข้อเท็จจริงที่พบ (จำเป็น)' : 'รายการที่ต้องแก้ (จำเป็น)'}
          </label>
          {isOverloadMode ? (
            <textarea className="input min-h-24" id="overload_report_reason" name="overload_report_reason" required />
          ) : (
            <textarea className="input min-h-24" id="customer_fix_note" name="customer_fix_note" required />
          )}
        </div>
        {!isOverloadMode ? (
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
        ) : null}
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor={isOverloadMode ? 'overload_report_note' : 'survey_note_fail'}>
            หมายเหตุเพิ่มเติม
          </label>
          {isOverloadMode ? (
            <textarea className="input min-h-24" id="overload_report_note" name="overload_report_note" />
          ) : (
            <textarea className="input min-h-24" id="survey_note_fail" name="survey_note" />
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" type="button" onClick={onClose}>
            ยกเลิก
          </button>
          <button className="btn-primary" type="submit">
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
