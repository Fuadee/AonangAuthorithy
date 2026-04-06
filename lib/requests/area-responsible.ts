import { isAreaCode, type AreaCode } from '@/lib/requests/areas';
import { getSurveyorDisplayName } from '@/lib/requests/surveyor-display';

type SurveyorDirectoryEntry = {
  id?: string | null;
  code?: string | null;
  name?: string | null;
};

export const AREA_RESPONSIBLE_MAP: Record<AreaCode, string> = {
  AREA_1: 'STAFF_A',
  AREA_2: 'STAFF_B',
  AREA_3: 'STAFF_B'
};

export function getResponsibleByAreaCode(areaCode: string, surveyors: SurveyorDirectoryEntry[] = []): string | null {
  if (!isAreaCode(areaCode)) {
    return null;
  }

  const responsibleSurveyorCode = AREA_RESPONSIBLE_MAP[areaCode];
  const responsibleSurveyor = surveyors.find(
    (surveyor) => surveyor.code?.trim() === responsibleSurveyorCode || surveyor.id?.trim() === responsibleSurveyorCode
  );
  const responsibleNameFromDirectory = responsibleSurveyor?.name?.trim();

  if (responsibleNameFromDirectory) {
    return responsibleNameFromDirectory;
  }

  return getSurveyorDisplayName(responsibleSurveyorCode);
}

export function isResponsibleForArea(areaCode: string, assigneeName: string, surveyors: SurveyorDirectoryEntry[] = []): boolean {
  const responsibleName = getResponsibleByAreaCode(areaCode, surveyors);
  if (!responsibleName) {
    return false;
  }

  return responsibleName === assigneeName.trim();
}
