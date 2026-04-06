import { isAreaCode, type AreaCode } from '@/lib/requests/areas';

export const AREA_RESPONSIBLE_MAP: Record<AreaCode, string> = {
  AREA_1: 'นาย A',
  AREA_2: 'นาย B',
  AREA_3: 'นาย B'
};

export function getResponsibleByAreaCode(areaCode: string): string | null {
  if (!isAreaCode(areaCode)) {
    return null;
  }

  return AREA_RESPONSIBLE_MAP[areaCode];
}

export function isResponsibleForArea(areaCode: string, assigneeName: string): boolean {
  const responsibleName = getResponsibleByAreaCode(areaCode);
  if (!responsibleName) {
    return false;
  }

  return responsibleName === assigneeName.trim();
}
