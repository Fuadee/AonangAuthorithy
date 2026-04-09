'use client';

import { FormEvent, MouseEvent, ReactNode, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { markSurveyFailedActionSafe } from '@/app/actions';

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  if (!open) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const formData = new FormData(event.currentTarget);
    const actionBranch = failureType === 'OVERLOAD_REPORTED' ? 'OVERLOAD_REPORTED' : 'NORMAL_FIX_REQUIRED';
    formData.set('action_intent', 'SURVEY_FAIL');
    formData.set('action_branch', actionBranch);

    console.info('[survey-fail-dialog] submitting payload', {
      request_id: formData.get('request_id'),
      survey_failure_type: formData.get('survey_failure_type'),
      customer_fix_note: formData.get('customer_fix_note'),
      overload_report_reason: formData.get('overload_report_reason'),
      survey_note: formData.get('survey_note'),
      overload_report_note: formData.get('overload_report_note'),
      action_intent: formData.get('action_intent'),
      action_branch: formData.get('action_branch'),
      stay_on_queue: formData.get('stay_on_queue')
    });

    startTransition(async () => {
      try {
        const result = await markSurveyFailedActionSafe(formData);
        if (!result.ok) {
          setSubmitError(result.error || 'ไม่สามารถบันทึกผลสำรวจไม่ผ่านได้ กรุณาลองใหม่อีกครั้ง');
          return;
        }

        onClose();
        if (stayOnQueue) {
          router.refresh();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด';
        console.error('[survey-fail-dialog] submit failed', { message, error });
        setSubmitError(message || 'ไม่สามารถบันทึกผลสำรวจไม่ผ่านได้ กรุณาลองใหม่อีกครั้ง');
      }
    });
  };

  const isOverloadMode = failureType === 'OVERLOAD_REPORTED';
  const submitLabel = useMemo(() => (isOverloadMode ? 'ทำบันทึกต่อผู้จัดการ' : 'ยืนยัน'), [isOverloadMode]);

  return (
    <Modal title="บันทึกผลสำรวจไม่ผ่าน" onClose={onClose}>
      <form className="space-y-3" onSubmit={handleSubmit}>
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
          <button className="btn-secondary" disabled={isSubmitting} type="button" onClick={onClose}>
            ยกเลิก
          </button>
          <button className="btn-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'กำลังบันทึก...' : submitLabel}
          </button>
        </div>
        {submitError ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
      </form>
    </Modal>
  );
}
