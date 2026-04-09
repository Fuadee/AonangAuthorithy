import { FlowType, getFlowTypeLabel } from '@/lib/requests/types';

type FlowTypeBadgeProps = {
  flowType: FlowType;
};

const FLOW_TYPE_BADGE_TONE: Record<FlowType, string> = {
  METER: 'bg-sky-100 text-sky-700',
  EXPANSION: 'bg-orange-100 text-orange-700'
};

export function FlowTypeBadge({ flowType }: FlowTypeBadgeProps) {
  return (
    <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-semibold ${FLOW_TYPE_BADGE_TONE[flowType]}`}>
      {getFlowTypeLabel(flowType)}
    </span>
  );
}
