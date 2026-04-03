'use client';

import { MouseEvent, useMemo, useState } from 'react';
import { updateSurveyorAction } from '@/app/actions';
import { RequestStatus } from '@/lib/requests/types';

type SurveyorActionWorkflowProps = {
  requestId: string;
  currentStatus: RequestStatus;
};

type SurveyorAction = 'ACCEPT' | 'DOCS_INCOMPLETE' | 'REQUEST_RESCHEDULE' | 'COMPLETE';

type ActionConfig = {
  action: SurveyorAction;
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  requireNote?: boolean;
  showDate?: boolean;
};

const ACTION_CONFIGS: Record<SurveyorAction, ActionConfig> = {
  ACCEPT: {
    action: 'ACCEPT',
    label: 'รับงาน',
    title: 'ยืนยันรับงานสำรวจ',
    description: 'เมื่อกดยืนยัน ระบบจะเปลี่ยนสถานะเป็น “รับงานสำรวจแล้ว” ทันที',
    confirmLabel: 'ยืนยันรับงาน'
  },
  DOCS_INCOMPLETE: {
    action: 'DOCS_INCOMPLETE',
    label: 'เอกสารไม่ครบ',
    title: 'แจ้งเอกสารไม่ครบ',
    description: 'ระบุเอกสารที่ขาดเพื่อให้เจ้าหน้าที่ติดตามต่อ',
    confirmLabel: 'ยืนยันว่าเอกสารไม่ครบ',
    requireNote: true
  },
  REQUEST_RESCHEDULE: {
    action: 'REQUEST_RESCHEDULE',
    label: 'ขอเลื่อนวันสำรวจ',
    title: 'ขอเลื่อนวันสำรวจ',
    description: 'เลือกวันใหม่ แล้วระบบจะส่งงานกลับให้เจ้าหน้าที่ประสานนัดหมาย',
    confirmLabel: 'ยืนยันขอเลื่อนวันสำรวจ',
    showDate: true
  },
  COMPLETE: {
    action: 'COMPLETE',
    label: 'สำรวจแล้ว',
    title: 'ยืนยันว่าลงพื้นที่สำรวจแล้ว',
    description: 'ใช้เมื่อสำรวจหน้างานเสร็จเรียบร้อยแล้ว',
    confirmLabel: 'ยืนยันสำรวจแล้ว'
  }
};

const STATUS_ACTIONS: Partial<Record<RequestStatus, SurveyorAction[]>> = {
  PENDING_SURVEY_REVIEW: ['ACCEPT', 'DOCS_INCOMPLETE', 'REQUEST_RESCHEDULE'],
  SURVEY_ACCEPTED: ['COMPLETE', 'REQUEST_RESCHEDULE'],
  SURVEY_RESCHEDULE_REQUESTED: ['COMPLETE']
};

const STATUS_MESSAGES: Partial<Record<RequestStatus, string>> = {
  SURVEY_DOCS_INCOMPLETE: 'รอเจ้าหน้าที่ติดตามเอกสาร',
  SURVEY_COMPLETED: 'สำรวจเสร็จสิ้นแล้ว',
  WAIT_DOCUMENT_REVIEW: 'สำรวจเสร็จแล้ว รอเจ้าหน้าที่ตรวจเอกสารหลังสำรวจ',
  WAIT_DOCUMENT_FOLLOWUP: 'กำลังติดตามเอกสารเพิ่มเติม'
};

function ActionModal({
  config,
  onClose,
  requestId
}: {
  config: ActionConfig;
  onClose: () => void;
  requestId: string;
}) {
  const onBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onBackdropClick}>
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h4 className="text-lg font-semibold text-slate-900">{config.title}</h4>
        <p className="mt-1 text-sm text-slate-600">{config.description}</p>

        <form action={updateSurveyorAction} className="mt-4 space-y-4">
          <input name="request_id" type="hidden" value={requestId} />
          <input name="action" type="hidden" value={config.action} />

          {config.requireNote || config.action === 'COMPLETE' || config.action === 'REQUEST_RESCHEDULE' ? (
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="survey_note">
                หมายเหตุ {config.requireNote ? '(จำเป็น)' : '(ถ้ามี)'}
              </label>
              <textarea
                className="input min-h-24"
                id="survey_note"
                name="survey_note"
                placeholder="เช่น ขาดสำเนาทะเบียนบ้าน หรือพบข้อสังเกตหน้างาน"
                required={config.requireNote}
              />
            </div>
          ) : null}

          {config.showDate ? (
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="survey_reschedule_date">
                วันสำรวจใหม่
              </label>
              <input className="input" id="survey_reschedule_date" name="survey_reschedule_date" required type="date" />
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={onClose} type="button">
              ยกเลิก
            </button>
            <button className="btn-primary" type="submit">
              {config.confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SurveyorActionWorkflow({ requestId, currentStatus }: SurveyorActionWorkflowProps) {
  const [activeAction, setActiveAction] = useState<SurveyorAction | null>(null);

  const enabledActions = useMemo(() => STATUS_ACTIONS[currentStatus] ?? [], [currentStatus]);

  if (STATUS_MESSAGES[currentStatus]) {
    return <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{STATUS_MESSAGES[currentStatus]}</p>;
  }

  if (!enabledActions.length) {
    return <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">สถานะนี้ยังไม่มีปุ่มให้ดำเนินการ</p>;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {enabledActions.map((action) => {
          const config = ACTION_CONFIGS[action];
          return (
            <button
              className={action === 'ACCEPT' || action === 'COMPLETE' ? 'btn-primary' : 'btn-secondary'}
              key={action}
              onClick={() => setActiveAction(action)}
              type="button"
            >
              {config.label}
            </button>
          );
        })}
      </div>

      {activeAction ? <ActionModal config={ACTION_CONFIGS[activeAction]} onClose={() => setActiveAction(null)} requestId={requestId} /> : null}
    </>
  );
}
