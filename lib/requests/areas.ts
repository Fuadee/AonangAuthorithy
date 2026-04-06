export const AREA_CODES = ['AREA_1', 'AREA_2', 'AREA_3'] as const;

export type AreaCode = (typeof AREA_CODES)[number];

export const AREA_LABELS: Record<AreaCode, string> = {
  AREA_1: 'อ่าวนาง',
  AREA_2: 'หนองทะเล',
  AREA_3: 'ไสไทย'
};

const LEGACY_AREA_NAMES: Record<string, AreaCode> = {
  'พื้นที่ 1': 'AREA_1',
  'พื้นที่ 2': 'AREA_2',
  'พื้นที่ 3': 'AREA_3'
};

function normalizeAreaCodeLikeValue(value: string): string {
  return value.trim().toUpperCase();
}

function extractAreaCode(value: string): AreaCode | null {
  const normalizedValue = normalizeAreaCodeLikeValue(value);

  if (isAreaCode(normalizedValue)) {
    return normalizedValue;
  }

  if (normalizedValue.includes('|')) {
    const [left] = normalizedValue.split('|');
    const normalizedLeft = left?.trim();
    if (normalizedLeft && isAreaCode(normalizedLeft)) {
      return normalizedLeft;
    }
  }

  return null;
}

export function formatAreaLabel(value: string): string {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return '-';
  }

  const fromCode = extractAreaCode(normalizedValue);
  if (fromCode) {
    return AREA_LABELS[fromCode];
  }

  const fromLegacyName = LEGACY_AREA_NAMES[normalizedValue];
  if (fromLegacyName) {
    return AREA_LABELS[fromLegacyName];
  }

  return normalizedValue;
}

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

  return formatAreaLabel(normalizedAreaName);
}
