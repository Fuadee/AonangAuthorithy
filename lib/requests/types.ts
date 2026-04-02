export const REQUEST_STATUSES = ['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export const REQUEST_TYPES = ['METER', 'EXPANSION'] as const;

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  METER: 'ขอมิเตอร์',
  EXPANSION: 'ขอขยายเขต'
};

export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type RequestType = (typeof REQUEST_TYPES)[number];

export type Area = {
  id: string;
  code: string;
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
  status: RequestStatus;
  request_type: RequestType;
  created_at: string;
  updated_at: string;
};
