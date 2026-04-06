import { isAreaCode, type AreaCode } from '@/lib/requests/areas';

type SurveyorDirectoryEntry = {
  id?: string | null;
  code?: string | null;
  name?: string | null;
};

export const AREA_RESPONSIBLE_MAP: Record<AreaCode, string> = {
  AREA_1: 'staff_a',
  AREA_2: 'staff_b',
  AREA_3: 'staff_b'
};

function normalizeIdentifier(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

export function getResponsibleSurveyorIdByAreaCode(areaCode: string): string | null {
  if (!isAreaCode(areaCode)) {
    return null;
  }

  return AREA_RESPONSIBLE_MAP[areaCode];
}

export function getResponsibleByAreaCode(areaCode: string, surveyors: SurveyorDirectoryEntry[] = []): string | null {
  const responsibleSurveyorId = getResponsibleSurveyorIdByAreaCode(areaCode);
  if (!responsibleSurveyorId) {
    return null;
  }

  const normalizedResponsibleSurveyorId = normalizeIdentifier(responsibleSurveyorId);
  const responsibleSurveyor = surveyors.find((surveyor) => normalizeIdentifier(surveyor.id) === normalizedResponsibleSurveyorId);
  const responsibleNameFromDirectory = responsibleSurveyor?.name?.trim();

  return responsibleNameFromDirectory || '-';
}

export function isResponsibleForArea(areaCode: string, assigneeName: string, surveyors: SurveyorDirectoryEntry[] = []): boolean {
  const responsibleName = getResponsibleByAreaCode(areaCode, surveyors);
  if (!responsibleName || responsibleName === '-') {
    return false;
  }

  return responsibleName === assigneeName.trim();
}
