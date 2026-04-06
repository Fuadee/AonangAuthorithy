import { updateRequestAssigneeAction } from '@/app/actions';
import { Assignee } from '@/lib/requests/types';
import { getSurveyorDisplayNameFromAssignee } from '@/lib/requests/surveyor-display';

type RequestAssigneeFormProps = {
  requestId: string;
  currentAssigneeId: string;
  assignees: Assignee[];
};

export function RequestAssigneeForm({
  requestId,
  currentAssigneeId,
  assignees
}: RequestAssigneeFormProps) {
  return (
    <form action={updateRequestAssigneeAction} className="space-y-3">
      <input name="request_id" type="hidden" value={requestId} />
      <div>
        <label className="text-sm font-medium" htmlFor="assignee_id">
          เปลี่ยนผู้รับผิดชอบ
        </label>
        <select className="input" id="assignee_id" name="assignee_id" defaultValue={currentAssigneeId}>
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>
              {getSurveyorDisplayNameFromAssignee(assignee)}
            </option>
          ))}
        </select>
      </div>
      <button className="btn-primary" type="submit">
        อัปเดตผู้รับผิดชอบ
      </button>
    </form>
  );
}
