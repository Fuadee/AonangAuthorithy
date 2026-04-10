export type SmvTrend = 'up' | 'steady' | 'down';

export type SmvAxis = {
  id: string;
  labelTh: string;
  score: number;
  trend: SmvTrend;
  today: number;
  week: number;
  streak: number;
};
