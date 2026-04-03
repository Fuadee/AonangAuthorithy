'use client';

export default function SurveyMapError({ reset }: { reset: () => void }) {
  return (
    <div className="card space-y-3 p-6">
      <h3 className="text-lg font-semibold text-rose-700">โหลดคิวสำรวจไม่สำเร็จ</h3>
      <p className="text-sm text-slate-600">กรุณาลองใหม่อีกครั้ง หรือกลับไปหน้า dashboard</p>
      <button className="btn-primary" type="button" onClick={() => reset()}>
        ลองโหลดใหม่
      </button>
    </div>
  );
}
