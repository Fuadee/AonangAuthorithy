import type { AreaCode } from '@/lib/requests/areas';

export const REQUEST_STATUSES = [
  'NEW',
  'PENDING_SURVEY_REVIEW',
  'SURVEY_ACCEPTED',
  'SURVEY_DOCS_INCOMPLETE',
  'SURVEY_RESCHEDULE_REQUESTED',
  'SURVEY_COMPLETED'
] as const;
export const REQUEST_TYPES = ['METER', 'EXPANSION'] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  METER: 'ขอมิเตอร์',
  EXPANSION: 'ขอขยายเขต'
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  NEW: 'คำร้องใหม่',
  PENDING_SURVEY_REVIEW: 'รอตรวจเอกสารโดยนักสำรวจ',
  SURVEY_ACCEPTED: 'นักสำรวจรับงานแล้ว',
  SURVEY_DOCS_INCOMPLETE: 'เอกสารไม่ครบ',
  SURVEY_RESCHEDULE_REQUESTED: 'ขอเลื่อนวันสำรวจ',
  SURVEY_COMPLETED: 'สำรวจแล้ว'
};

export const SURVEYOR_VISIBLE_STATUSES: RequestStatus[] = [
  'PENDING_SURVEY_REVIEW',
  'SURVEY_ACCEPTED',
  'SURVEY_DOCS_INCOMPLETE',
  'SURVEY_RESCHEDULE_REQUESTED',
  'SURVEY_COMPLETED'
];

export function getRequestStatusLabel(status: RequestStatus): string {
  return REQUEST_STATUS_LABELS[status];
}

export type Area = {
  id: string;
  code: AreaCode;
  name: string;
};

export type Assignee = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
};

export type ServiceRequest = {
  id: string;
  request_no: string;
  customer_name: string;
  phone: string;
  area_name: string;
  assignee_name: string;
  assigned_surveyor: string | null;
  scheduled_survey_date: string | null;
  status: RequestStatus;
  request_type: RequestType;
  survey_note: string | null;
  survey_reschedule_date: string | null;
  survey_reviewed_at: string | null;
  survey_completed_at: string | null;
  created_at: string;
  updated_at: string;
};
