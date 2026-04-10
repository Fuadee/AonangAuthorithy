import { SmvAxis } from '@/lib/smv/types';

export const SMV_AXES: SmvAxis[] = [
  { id: 'discipline', labelTh: 'วินัย', score: 72, trend: 'up', today: 74, week: 71, streak: 5 },
  { id: 'focus', labelTh: 'โฟกัส', score: 61, trend: 'steady', today: 60, week: 62, streak: 3 },
  { id: 'health', labelTh: 'สุขภาพ', score: 84, trend: 'up', today: 82, week: 80, streak: 8 },
  { id: 'learning', labelTh: 'การเรียนรู้', score: 57, trend: 'down', today: 55, week: 59, streak: 1 },
  { id: 'execution', labelTh: 'การลงมือทำ', score: 68, trend: 'up', today: 70, week: 66, streak: 4 },
  { id: 'balance', labelTh: 'สมดุลชีวิต', score: 77, trend: 'steady', today: 76, week: 77, streak: 6 }
];

export function getDefaultAxisId(axes: SmvAxis[]): string {
  if (axes.length === 0) {
    return '';
  }

  return [...axes].sort((a, b) => a.score - b.score || a.labelTh.localeCompare(b.labelTh, 'th'))[0].id;
}
