import type { ServiceRequest } from '@/lib/requests/types';

type AddressParts = Pick<ServiceRequest, 'house_number' | 'village_no' | 'road' | 'landmark' | 'area_name'>;

export function buildFullAddress(parts: AddressParts): string {
  const lineParts: string[] = [];

  if (parts.house_number) {
    lineParts.push(`บ้านเลขที่ ${parts.house_number}`);
  }
  if (parts.village_no) {
    lineParts.push(`หมู่ ${parts.village_no}`);
  }
  if (parts.road) {
    lineParts.push(`ถนน${parts.road}`);
  }

  const areaSuffix = `ต.${parts.area_name}`;
  const base = [...lineParts, areaSuffix].join(' ');

  if (parts.landmark) {
    if (lineParts.length === 0) {
      return `${parts.landmark} ${areaSuffix}`;
    }

    return `${base} (${parts.landmark})`;
  }

  return base;
}
