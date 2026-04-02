import { updateRequestStatusAction } from '@/app/actions';
import { RequestStatus, REQUEST_STATUSES } from '@/lib/requests/types';

type RequestStatusFormProps = {
  requestId: string;
  currentStatus: RequestStatus;
};

export function RequestStatusForm({ requestId, currentStatus }: RequestStatusFormProps) {
  return (
    <form action={updateRequestStatusAction} className="space-y-3">
      <input name="request_id" type="hidden" value={requestId} />
      <div>
        <label className="text-sm font-medium" htmlFor="status">
          เปลี่ยนสถานะ
        </label>
        <select className="input" id="status" name="status" defaultValue={currentStatus}>
          {REQUEST_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
      <button className="btn-primary" type="submit">
        อัปเดตสถานะ
      </button>
    </form>
  );
}
