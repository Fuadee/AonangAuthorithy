'use client';

import { useEffect, useMemo, useState } from 'react';
import { updateSurveyorAction } from '@/app/actions';
import { RequestStatus } from '@/lib/requests/types';

type SurveyorActionFormProps = {
  requestId: string;
  currentStatus: RequestStatus;
};

type SurveyorAction = 'ACCEPT' | 'DOCS_INCOMPLETE' | 'REQUEST_RESCHEDULE' | 'COMPLETE';

const ACTION_BUTTONS: Array<{ action: SurveyorAction; label: string; className: string }> = [
  { action: 'ACCEPT', label: 'รับงาน', className: 'btn-primary' },
  { action: 'DOCS_INCOMPLETE', label: 'เอกสารไม่ครบ', className: 'btn-secondary' },
  { action: 'REQUEST_RESCHEDULE', label: 'ขอเลื่อนวันสำรวจ', className: 'btn-secondary' },
  { action: 'COMPLETE', label: 'สำรวจแล้ว', className: 'btn-primary' }
];

const ACTION_HINTS: Record<SurveyorAction, string> = {
  ACCEPT: 'ยืนยันว่าตรวจเอกสารแล้วและพร้อมรับงานสำรวจ',
  DOCS_INCOMPLETE: 'ต้องระบุหมายเหตุว่าขาดเอกสารอะไร',
  REQUEST_RESCHEDULE: 'ต้องเลือกวันสำรวจใหม่อย่างน้อย 1 วัน',
  COMPLETE: 'ใช้เมื่อสำรวจเสร็จเรียบร้อยแล้ว'
};

const ALLOWED_STATUSES: Record<SurveyorAction, RequestStatus[]> = {
  ACCEPT: ['PENDING_SURVEY_REVIEW', 'SURVEY_DOCS_INCOMPLETE', 'SURVEY_RESCHEDULE_REQUESTED'],
  DOCS_INCOMPLETE: ['PENDING_SURVEY_REVIEW', 'SURVEY_ACCEPTED'],
  REQUEST_RESCHEDULE: ['PENDING_SURVEY_REVIEW', 'SURVEY_ACCEPTED'],
  COMPLETE: ['SURVEY_ACCEPTED', 'SURVEY_RESCHEDULE_REQUESTED']
};

export function SurveyorActionForm({ requestId, currentStatus }: SurveyorActionFormProps) {
  const enabledButtons = useMemo(
    () => ACTION_BUTTONS.filter((item) => ALLOWED_STATUSES[item.action].includes(currentStatus)),
    [currentStatus]
  );
  const [selectedAction, setSelectedAction] = useState<SurveyorAction>(enabledButtons[0]?.action ?? 'ACCEPT');

  useEffect(() => {
    if (!enabledButtons.some((item) => item.action === selectedAction)) {
      setSelectedAction(enabledButtons[0]?.action ?? 'ACCEPT');
    }
  }, [enabledButtons, selectedAction]);

  return (
    <form action={updateSurveyorAction} className="space-y-4">
      <input name="request_id" type="hidden" value={requestId} />
      <input name="action" type="hidden" value={selectedAction} />

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">งานที่ต้องการทำตอนนี้</p>
        <div className="flex flex-wrap gap-2">
          {enabledButtons.map((item) => (
            <button
              key={item.action}
              className={`rounded-lg border px-3 py-2 text-sm transition ${
                selectedAction === item.action
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              type="button"
              onClick={() => setSelectedAction(item.action)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {!enabledButtons.length ? (
          <p className="text-sm text-amber-600">สถานะปัจจุบันยังไม่รองรับ action จากฝั่งนักสำรวจ</p>
        ) : (
          <p className="text-xs text-slate-500">{ACTION_HINTS[selectedAction]}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="survey_note">
          ผลการตรวจเอกสาร / หมายเหตุล่าสุด
        </label>
        <textarea
          className="input min-h-24"
          id="survey_note"
          name="survey_note"
          placeholder="เช่น ขาดสำเนาทะเบียนบ้าน"
          required={selectedAction === 'DOCS_INCOMPLETE'}
        />
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="survey_reschedule_date">
          วันสำรวจนัดหมายใหม่ (กรณีขอเลื่อน)
        </label>
        <input
          className="input"
          id="survey_reschedule_date"
          name="survey_reschedule_date"
          type="date"
          required={selectedAction === 'REQUEST_RESCHEDULE'}
        />
      </div>

      <button className="btn-primary" disabled={!enabledButtons.length} type="submit">
        ยืนยันการดำเนินการ
      </button>
    </form>
  );
}
