import {
  METER_SIZE_LABELS,
  PHASE_LABELS,
  REQUEST_INTENT_LABELS,
  RequestIntent,
  isMeterSize,
  isPhaseType,
  isRequestIntent
} from '@/lib/requests/request-intent';
import { getFlowType, RequestType, ServiceRequest } from '@/lib/requests/types';

type RequestDisplaySource = Pick<ServiceRequest, 'request_type' | 'status'> &
  Partial<Pick<ServiceRequest, 'request_intent' | 'meter_size' | 'phase' | 'flow_type' | 'three_phase_capability_result'>>;

const REQUEST_TYPE_TO_PRIMARY_INTENT: Record<RequestType, RequestIntent> = {
  METER: 'NEW_METER',
  METER_30_100_1P: 'NEW_METER',
  METER_30_100_3P: 'NEW_METER',
  METER_TO_3PHASE: 'PHASE_UPGRADE',
  EXPANSION: 'EXPANSION'
};

export function getPrimaryRequestType(request: RequestDisplaySource): RequestIntent {
  const rawIntent = request.request_intent;
  if (rawIntent && isRequestIntent(rawIntent)) {
    if (rawIntent === 'PHASE_UPGRADE' && getFlowType(request) === 'EXPANSION') {
      return 'EXPANSION';
    }
    return rawIntent;
  }

  if (request.request_type === 'METER_TO_3PHASE' && getFlowType(request) === 'EXPANSION') {
    return 'EXPANSION';
  }

  return REQUEST_TYPE_TO_PRIMARY_INTENT[request.request_type as RequestType] ?? 'NEW_METER';
}

export function getRequestTypeDisplay(request: RequestDisplaySource): string {
  return REQUEST_INTENT_LABELS[getPrimaryRequestType(request)];
}

export function getRequestSubtypeDisplay(request: RequestDisplaySource): string {
  return getRequestTechnicalSummary(request);
}

export function getRequestIntentLabel(request: RequestDisplaySource): string {
  return getRequestTypeDisplay(request);
}

export function getRequestTechnicalSummary(request: RequestDisplaySource): string {
  const meterLabel = resolveMeterSizeLabel(request.meter_size);
  const phaseLabel = resolvePhaseLabel(request.phase);

  if (meterLabel && phaseLabel) {
    return `${meterLabel} (${phaseLabel})`;
  }

  if (meterLabel) {
    return meterLabel;
  }

  if (phaseLabel) {
    return phaseLabel;
  }

  return '';
}

function resolveMeterSizeLabel(value: string | null | undefined): string {
  if (value && isMeterSize(value)) {
    return METER_SIZE_LABELS[value];
  }
  return '';
}

function resolvePhaseLabel(value: string | null | undefined): string {
  if (value && isPhaseType(value)) {
    return PHASE_LABELS[value];
  }
  return '';
}
