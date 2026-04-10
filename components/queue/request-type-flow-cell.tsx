import { FlowTypeBadge } from '@/components/queue/flow-type-badge';
import { getRequestIntentLabel, getRequestTechnicalSummary } from '@/lib/requests/request-display';
import { getFlowType, ServiceRequest } from '@/lib/requests/types';

type RequestTypeFlowCellProps = {
  request: Pick<ServiceRequest, 'request_type' | 'status' | 'request_intent' | 'meter_size' | 'phase'> &
    Partial<Pick<ServiceRequest, 'flow_type' | 'three_phase_capability_result'>>;
  className?: string;
};

export function RequestTypeFlowCell({ request, className }: RequestTypeFlowCellProps) {
  const flowType = getFlowType(request);
  const requestIntentLabel = getRequestIntentLabel(request);
  const technicalSummary = getRequestTechnicalSummary(request);

  return (
    <div className={className}>
      <p className="truncate whitespace-nowrap text-sm leading-5 text-slate-700" title={requestIntentLabel}>
        {requestIntentLabel}
      </p>
      {technicalSummary ? (
        <p className="truncate whitespace-nowrap text-xs leading-5 text-slate-500" title={technicalSummary}>
          {technicalSummary}
        </p>
      ) : null}
      <div className="mt-1">
        <FlowTypeBadge flowType={flowType} />
      </div>
    </div>
  );
}
