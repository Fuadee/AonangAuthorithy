'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { convertMeterToExpansionAction } from '@/app/actions';

type ConvertToExpansionActionProps = {
  requestId: string;
};

export function ConvertToExpansionAction({ requestId }: ConvertToExpansionActionProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const closeModal = () => {
    if (isPending) {
      return;
    }
    setIsOpen(false);
    setError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setError('กรุณากรอกเหตุผลในการเปลี่ยนประเภทคำร้อง');
      return;
    }

    const formData = new FormData();
    formData.set('request_id', requestId);
    formData.set('conversion_reason', trimmedReason);

    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const result = await convertMeterToExpansionAction(formData);
        setSuccessMessage(result.message);
        setIsOpen(false);
        setReason('');
        window.setTimeout(() => {
          router.refresh();
        }, 900);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'ไม่สามารถเปลี่ยนเป็นงานขยายเขตได้ กรุณาลองใหม่อีกครั้ง');
      }
    });
  };

  return (
    <>
      <div className="mt-3 flex flex-col items-start gap-2">
        <button className="btn-flow-warning" type="button" onClick={() => setIsOpen(true)}>
          เปลี่ยนเป็นงานขยายเขต
        </button>
        {successMessage ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            {successMessage}
          </p>
        ) : null}
      </div>

      {isOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          onClick={closeModal}
        >
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h4 className="text-lg font-semibold text-slate-900">ยืนยันการเปลี่ยนเป็นงานขยายเขต</h4>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              คำร้องนี้จะถูกเปลี่ยนจาก “ขอมิเตอร์ใหม่” เป็น “งานขยายเขต” และระบบจะย้ายสถานะไปยังขั้นตอนเริ่มต้นของงานขยายเขต
              โดยไม่ลบข้อมูลเดิม
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="conversion-reason">
                  เหตุผลในการเปลี่ยนประเภทคำร้อง
                </label>
                <textarea
                  className="input mt-2 min-h-28"
                  disabled={isPending}
                  id="conversion-reason"
                  required
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                    if (error) {
                      setError(null);
                    }
                  }}
                />
              </div>

              {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button className="btn-flow-neutral" disabled={isPending} type="button" onClick={closeModal}>
                  ยกเลิก
                </button>
                <button className="btn-flow-warning" disabled={isPending || !reason.trim()} type="submit">
                  {isPending ? 'กำลังบันทึก...' : 'ยืนยันเปลี่ยนเป็นงานขยายเขต'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
