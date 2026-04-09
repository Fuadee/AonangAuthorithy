import { FlowTypeBadge } from '@/components/queue/flow-type-badge';
import { getFlowType, REQUEST_TYPE_LABELS, ServiceRequest } from '@/lib/requests/types';

type RequestTypeFlowCellProps = {
  request: Pick<ServiceRequest, 'request_type' | 'status'> & Partial<Pick<ServiceRequest, 'flow_type' | 'three_phase_capability_result'>>;
  className?: string;
};

export function RequestTypeFlowCell({ request, className }: RequestTypeFlowCellProps) {
  const flowType = getFlowType(request);
  const requestTypeLabel = REQUEST_TYPE_LABELS[request.request_type];

  return (
    <div className={className}>
      <p className="truncate whitespace-nowrap text-sm leading-5 text-slate-700" title={requestTypeLabel}>
        {requestTypeLabel}
      </p>
      <div className="mt-1">
        <FlowTypeBadge flowType={flowType} />
      </div>
    </div>
  );
}
