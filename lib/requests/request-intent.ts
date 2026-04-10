import { FlowType, RequestType } from '@/lib/requests/types';

export const REQUEST_INTENTS = ['NEW_METER', 'UPSCALE', 'RELOCATE', 'PHASE_UPGRADE', 'EXPANSION'] as const;
export const METER_SIZES = ['NORMAL', 'THIRTY_ONE_HUNDRED'] as const;
export const PHASE_TYPES = ['ONE_PHASE', 'THREE_PHASE'] as const;

export type RequestIntent = (typeof REQUEST_INTENTS)[number];
export type MeterSize = (typeof METER_SIZES)[number];
export type PhaseType = (typeof PHASE_TYPES)[number];

export type ResolvedRequestSubmission = {
  intent: RequestIntent;
  meterSize: MeterSize | null;
  phase: PhaseType | null;
  requestType: RequestType;
  flowType: FlowType;
  pathFamily:
    | 'EXPANSION_DIRECT'
    | 'METER_DIRECT'
    | 'METER_30_100_KRABI'
    | 'METER_3P_CAPABILITY_GATE'
    | 'METER_30_100_3P_CAPABILITY_GATE';
};

export const REQUEST_INTENT_LABELS: Record<RequestIntent, string> = {
  NEW_METER: 'ขอมิเตอร์ใหม่',
  UPSCALE: 'เพิ่มขนาด',
  RELOCATE: 'ย้ายมิเตอร์',
  PHASE_UPGRADE: 'เพิ่มเฟส',
  EXPANSION: 'ขยายเขต'
};

export const METER_SIZE_LABELS: Record<MeterSize, string> = {
  NORMAL: 'ปกติ',
  THIRTY_ONE_HUNDRED: '30/100'
};

export const PHASE_LABELS: Record<PhaseType, string> = {
  ONE_PHASE: '1 เฟส',
  THREE_PHASE: '3 เฟส'
};

export function isRequestIntent(value: string): value is RequestIntent {
  return REQUEST_INTENTS.includes(value as RequestIntent);
}

export function isMeterSize(value: string): value is MeterSize {
  return METER_SIZES.includes(value as MeterSize);
}

export function isPhaseType(value: string): value is PhaseType {
  return PHASE_TYPES.includes(value as PhaseType);
}

export function resolveRequestSubmission(input: {
  intent?: string | null;
  meterSize?: string | null;
  phase?: string | null;
  legacyRequestType?: string | null;
}): ResolvedRequestSubmission {
  const intent = input.intent?.trim() ?? '';
  const meterSize = input.meterSize?.trim() ?? '';
  const phase = input.phase?.trim() ?? '';

  if (isRequestIntent(intent)) {
    return resolveFromModel(intent, meterSize, phase);
  }

  const legacyRequestType = input.legacyRequestType?.trim() ?? '';
  return resolveFromLegacyType(legacyRequestType);
}

function resolveFromModel(intent: RequestIntent, meterSizeRaw: string, phaseRaw: string): ResolvedRequestSubmission {
  if (intent === 'EXPANSION') {
    return {
      intent,
      meterSize: null,
      phase: null,
      requestType: 'EXPANSION',
      flowType: 'EXPANSION',
      pathFamily: 'EXPANSION_DIRECT'
    };
  }

  if (!isMeterSize(meterSizeRaw)) {
    throw new Error('Missing required field: meter_size');
  }

  const enforcedPhase = intent === 'PHASE_UPGRADE' ? 'THREE_PHASE' : phaseRaw;
  if (!isPhaseType(enforcedPhase)) {
    throw new Error('Missing required field: phase');
  }

  if (intent === 'PHASE_UPGRADE') {
    return {
      intent,
      meterSize: meterSizeRaw,
      phase: 'THREE_PHASE',
      requestType: 'METER_TO_3PHASE',
      flowType: 'METER',
      pathFamily:
        meterSizeRaw === 'THIRTY_ONE_HUNDRED' ? 'METER_30_100_3P_CAPABILITY_GATE' : 'METER_3P_CAPABILITY_GATE'
    };
  }

  if (meterSizeRaw === 'THIRTY_ONE_HUNDRED') {
    return {
      intent,
      meterSize: meterSizeRaw,
      phase: enforcedPhase,
      requestType: enforcedPhase === 'THREE_PHASE' ? 'METER_30_100_3P' : 'METER_30_100_1P',
      flowType: 'METER',
      pathFamily:
        enforcedPhase === 'THREE_PHASE' ? 'METER_30_100_3P_CAPABILITY_GATE' : 'METER_30_100_KRABI'
    };
  }

  return {
    intent,
    meterSize: meterSizeRaw,
    phase: enforcedPhase,
    requestType: enforcedPhase === 'THREE_PHASE' ? 'METER_TO_3PHASE' : 'METER',
    flowType: 'METER',
    pathFamily: enforcedPhase === 'THREE_PHASE' ? 'METER_3P_CAPABILITY_GATE' : 'METER_DIRECT'
  };
}

function resolveFromLegacyType(legacyRequestType: string): ResolvedRequestSubmission {
  if (legacyRequestType === 'EXPANSION') {
    return {
      intent: 'EXPANSION',
      meterSize: null,
      phase: null,
      requestType: 'EXPANSION',
      flowType: 'EXPANSION',
      pathFamily: 'EXPANSION_DIRECT'
    };
  }

  if (legacyRequestType === 'METER_30_100_1P') {
    return {
      intent: 'NEW_METER',
      meterSize: 'THIRTY_ONE_HUNDRED',
      phase: 'ONE_PHASE',
      requestType: 'METER_30_100_1P',
      flowType: 'METER',
      pathFamily: 'METER_30_100_KRABI'
    };
  }

  if (legacyRequestType === 'METER_30_100_3P') {
    return {
      intent: 'NEW_METER',
      meterSize: 'THIRTY_ONE_HUNDRED',
      phase: 'THREE_PHASE',
      requestType: 'METER_30_100_3P',
      flowType: 'METER',
      pathFamily: 'METER_30_100_3P_CAPABILITY_GATE'
    };
  }

  if (legacyRequestType === 'METER_TO_3PHASE') {
    return {
      intent: 'PHASE_UPGRADE',
      meterSize: 'NORMAL',
      phase: 'THREE_PHASE',
      requestType: 'METER_TO_3PHASE',
      flowType: 'METER',
      pathFamily: 'METER_3P_CAPABILITY_GATE'
    };
  }

  if (legacyRequestType === 'METER') {
    return {
      intent: 'NEW_METER',
      meterSize: 'NORMAL',
      phase: 'ONE_PHASE',
      requestType: 'METER',
      flowType: 'METER',
      pathFamily: 'METER_DIRECT'
    };
  }

  throw new Error('Invalid request type');
}
