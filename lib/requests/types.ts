export const REQUEST_STATUSES = ['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

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
  created_at: string;
  updated_at: string;
};
