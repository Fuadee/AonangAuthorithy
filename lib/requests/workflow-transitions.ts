import type { RequestStatus, RequestType } from './types';

const THIRTY_ONE_HUNDRED_REQUEST_TYPES: ReadonlyArray<RequestType> = ['METER_30_100_1P', 'METER_30_100_3P'];

export function resolveSurveyCompletionStatus(
  requestType: RequestType,
  collectDocsOnSite: boolean
): RequestStatus {
  if (requestType === 'METER_30_100_1P') {
    return 'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL';
  }

  if (requestType === 'METER_30_100_3P' || requestType === 'METER_TO_3PHASE') {
    return 'CHECK_3PHASE_CAPABILITY';
  }

  if (requestType === 'METER') {
    return collectDocsOnSite ? 'SURVEY_COMPLETED' : 'WAIT_MANAGER_REVIEW';
  }

  return 'WAIT_LAYOUT_DRAWING';
}

export function resolvePassedSurveyStatus(requestType: RequestType): RequestStatus {
  return THIRTY_ONE_HUNDRED_REQUEST_TYPES.includes(requestType)
    ? 'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL'
    : 'WAIT_MANAGER_REVIEW';
}

export function resolveThreePhaseCapabilityStatus(
  requestType: Extract<RequestType, 'METER_TO_3PHASE' | 'METER_30_100_3P'>,
  capability: 'SUPPORTED' | 'UNSUPPORTED'
): RequestStatus {
  if (capability === 'UNSUPPORTED') {
    return 'WAIT_LAYOUT_DRAWING';
  }

  return requestType === 'METER_30_100_3P'
    ? 'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL'
    : 'WAIT_MANAGER_REVIEW';
}

export function resolveEligibilityReviewStatus(_eligible: boolean): RequestStatus {
  return 'WAIT_AONANG_MANAGER_FINAL_APPROVAL';
}

export function resolveExpansionPostEstimationStatus(): RequestStatus {
  return 'COORDINATED_WITH_CONSTRUCTION';
}
