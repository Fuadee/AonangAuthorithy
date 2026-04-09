import { getRequestStatusLabel, RequestStatus } from '@/lib/requests/types';
import { getRequestStatusToneClass } from '@/lib/requests/status-style';

type RequestStatusBadgeProps = {
  status: RequestStatus;
  className?: string;
};

export function RequestStatusBadge({ status, className = '' }: RequestStatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getRequestStatusToneClass(status)} ${className}`.trim()}>
      {getRequestStatusLabel(status)}
    </span>
  );
}
