import { assignSurveyorAction } from "@/app/actions/request-actions";

type Surveyor = {
  id: string;
  full_name: string;
  area_code: string | null;
};

export function AssignSurveyorForm({ requestId, surveyors }: { requestId: string; surveyors: Surveyor[] }) {
  return (
    <form action={assignSurveyorAction} className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
      <h3 className="font-semibold">มอบหมายผู้สำรวจ</h3>
      <input type="hidden" name="requestId" value={requestId} />
      <select name="assigneeId" className="w-full rounded border p-2" required defaultValue="">
        <option value="" disabled>
          เลือกผู้สำรวจ
        </option>
        {surveyors.map((s) => (
          <option key={s.id} value={s.id}>
            {s.full_name} ({s.area_code ?? "ทุกพื้นที่"})
          </option>
        ))}
      </select>
      <textarea name="note" className="w-full rounded border p-2" placeholder="หมายเหตุการมอบหมาย" />
      <button className="rounded bg-indigo-600 px-3 py-2 text-sm text-white" type="submit">
        Assign Surveyor
      </button>
    </form>
  );
}
