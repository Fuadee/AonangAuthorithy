'use client';

import { useMemo, useState } from 'react';
import { createRequestAction } from '@/app/actions';
import { Area, Assignee } from '@/lib/requests/types';

type RequestFormProps = {
  areas: Area[];
  assignees: Assignee[];
};

export function RequestForm({ areas, assignees }: RequestFormProps) {
  const [areaId, setAreaId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  const selectedArea = useMemo(() => areas.find((area) => area.id === areaId), [areas, areaId]);
  const selectedAssignee = useMemo(
    () => assignees.find((assignee) => assignee.id === assigneeId),
    [assignees, assigneeId]
  );

  return (
    <form action={createRequestAction} className="card space-y-5 p-6">
      <div>
        <label className="text-sm font-medium" htmlFor="customer_name">
          ชื่อลูกค้า
        </label>
        <input className="input" id="customer_name" name="customer_name" required />
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="phone">
          เบอร์โทรศัพท์
        </label>
        <input className="input" id="phone" name="phone" required />
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="area_id">
          พื้นที่
        </label>
        <select
          className="input"
          id="area_id"
          name="area_id"
          required
          value={areaId}
          onChange={(event) => setAreaId(event.target.value)}
        >
          <option value="">-- เลือกพื้นที่ --</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.code} | {area.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          {selectedArea ? `พื้นที่ที่เลือก: ${selectedArea.code} | ${selectedArea.name}` : 'ยังไม่เลือกพื้นที่'}
        </p>
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="assignee_id">
          ผู้รับผิดชอบ
        </label>
        <select
          className="input"
          id="assignee_id"
          name="assignee_id"
          required
          value={assigneeId}
          onChange={(event) => setAssigneeId(event.target.value)}
        >
          <option value="">-- เลือกผู้รับผิดชอบ --</option>
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>
              {assignee.code} | {assignee.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          {selectedAssignee
            ? `ผู้รับผิดชอบที่เลือก: ${selectedAssignee.code} | ${selectedAssignee.name}`
            : 'ยังไม่เลือกผู้รับผิดชอบ'}
        </p>
      </div>

      <button className="btn-primary w-full" type="submit">
        บันทึกคำร้อง
      </button>
    </form>
  );
}
