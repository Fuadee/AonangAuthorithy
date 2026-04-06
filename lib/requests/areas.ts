export const AREA_CODES = ['AREA_1', 'AREA_2', 'AREA_3'] as const;

export type AreaCode = (typeof AREA_CODES)[number];

export const AREA_LABELS: Record<AreaCode, string> = {
  AREA_1: 'อ่าวนาง',
  AREA_2: 'หนองทะเล',
  AREA_3: 'ไสไทย'
};

const LEGACY_AREA_2_NAMES = new Set(['พื้นที่ 2', 'AREA_2']);

export const LEGACY_AREA_2_LABEL = 'พื้นที่เดิม (AREA_2)';

export function isAreaCode(value: string): value is AreaCode {
  return (AREA_CODES as readonly string[]).includes(value);
}

export function resolveAreaLabelFromCode(areaCode: string): string {
  if (!isAreaCode(areaCode)) {
    return areaCode;
  }

  return AREA_LABELS[areaCode];
}

export function resolveAreaDisplayName(areaName: string | null | undefined): string {
  const normalizedAreaName = areaName?.trim();
  if (!normalizedAreaName) {
    return '-';
  }

  if (LEGACY_AREA_2_NAMES.has(normalizedAreaName)) {
    return LEGACY_AREA_2_LABEL;
  }

  return normalizedAreaName;
}
