import { FlowTypeBadge } from '@/components/queue/flow-type-badge';
import { getFlowType, REQUEST_TYPE_LABELS, ServiceRequest } from '@/lib/requests/types';

type RequestTypeFlowCellProps = {
  request: Pick<ServiceRequest, 'request_type' | 'status'> & Partial<Pick<ServiceRequest, 'flow_type' | 'three_phase_capability_result'>>;
  className?: string;
};

export function RequestTypeFlowCell({ request, className }: RequestTypeFlowCellProps) {
  const flowType = getFlowType(request);

  return (
    <div className={className}>
      <p className="text-sm leading-5 text-slate-700">{REQUEST_TYPE_LABELS[request.request_type]}</p>
      <div className="mt-1">
        <FlowTypeBadge flowType={flowType} />
      </div>
    </div>
  );
}
