'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RadarCard } from '@/components/smv/radar-card';
import { getDefaultAxisId, SMV_AXES } from '@/lib/smv/data';

export function SmvDashboard() {
  const router = useRouter();
  const axes = useMemo(() => SMV_AXES, []);
  const [selectedAxisId, setSelectedAxisId] = useState(() => getDefaultAxisId(axes));

  const handleViewChecklist = (axisId: string) => {
    router.push(`/smv/checklist?axis=${axisId}`);
  };

  const handleEditScore = (axisId: string) => {
    router.push(`/smv/edit-score?axis=${axisId}`);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(30,58,138,0.25),rgba(2,6,23,1)_60%)] px-4 py-8 text-slate-50 antialiased sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-blue-200/80">Mission Control</p>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">SMV Command View</h1>
          <p className="mx-auto max-w-2xl text-sm text-slate-300">ภาพรวมเรดาร์เป็นแกนหลัก แล้วค่อยเจาะรายละเอียดรายแกนผ่านปุ่มเลือกด้านล่าง</p>
        </header>

        <RadarCard
          axes={axes}
          selectedAxisId={selectedAxisId}
          onSelectAxis={setSelectedAxisId}
          onViewChecklist={handleViewChecklist}
          onEditScore={handleEditScore}
        />
      </div>
    </div>
  );
}
