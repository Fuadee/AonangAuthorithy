export const AREA_CODES = ['AREA_1', 'AREA_2'] as const;

export type AreaCode = (typeof AREA_CODES)[number];

export const AREA_LABELS: Record<AreaCode, string> = {
  AREA_1: 'พื้นที่ 1',
  AREA_2: 'พื้นที่ 2'
};

export function isAreaCode(value: string): value is AreaCode {
  return (AREA_CODES as readonly string[]).includes(value);
}
