import {
  METER_SIZE_LABELS,
  PHASE_LABELS,
  REQUEST_INTENT_LABELS,
  RequestIntent,
  isMeterSize,
  isPhaseType,
  isRequestIntent
} from '@/lib/requests/request-intent';
import { REQUEST_TYPE_LABELS, RequestType, ServiceRequest } from '@/lib/requests/types';

type RequestDisplaySource = Pick<ServiceRequest, 'request_type'> & Partial<Pick<ServiceRequest, 'request_intent' | 'meter_size' | 'phase'>>;

export function getRequestIntentLabel(request: RequestDisplaySource): string {
  const rawIntent = request.request_intent;
  if (rawIntent && isRequestIntent(rawIntent)) {
    return REQUEST_INTENT_LABELS[rawIntent as RequestIntent];
  }

  return REQUEST_TYPE_LABELS[request.request_type as RequestType];
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
