import type { RequestStatus } from '@/lib/requests/types';

export type SurveyQueueRequest = {
  id: string;
  request_no: string;
  customer_name: string;
  phone: string;
  request_type: string;
  area_name: string;
  assignee_name: string;
  assigned_surveyor: string | null;
  latest_survey_date: string | null;
  status: RequestStatus;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

export type SortMode =
  | 'NEAREST_FROM_MAP_CENTER'
  | 'FARTHEST_FROM_MAP_CENTER'
  | 'OLDEST_CREATED'
  | 'NEWEST_CREATED'
  | 'LATEST_SURVEY_DATE'
  | 'REQUEST_NO';

export type MobileViewMode = 'LIST' | 'MAP';
