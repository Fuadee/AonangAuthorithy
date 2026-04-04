import { REQUEST_TYPE_LABELS, RequestType } from '@/lib/requests/types';

type RequestTypeBadgeProps = {
  requestType: RequestType;
};

export function RequestTypeBadge({ requestType }: RequestTypeBadgeProps) {
  return <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{REQUEST_TYPE_LABELS[requestType]}</span>;
}
