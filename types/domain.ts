export const REQUEST_TYPES = ["METER", "EXTENSION"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_STATUSES = [
  "NEW",
  "PRELIM_CHECKED",
  "WAITING_SURVEY_ASSIGNMENT",
  "WAITING_SURVEYOR_DOCUMENT_REVIEW",
  "DOCUMENT_READY_FOR_SURVEY",
  "DOCUMENT_INCOMPLETE",
  "NEED_MORE_INFO",
  "SURVEY_SCHEDULED",
  "SURVEY_COMPLETED",
  "METER_WAITING_ICS",
  "METER_WAITING_INVOICE",
  "METER_WAITING_PAYMENT",
  "METER_WAITING_APPROVAL",
  "METER_WAITING_INSTALL_QUEUE",
  "METER_INSTALL_SCHEDULED",
  "METER_INSTALLED",
  "EXT_WAITING_SUMMARY",
  "EXT_WAITING_HQ_SUBMISSION",
  "EXT_SUBMITTED_TO_HQ",
  "EXT_WAITING_DECISION",
  "CLOSED"
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const ROLE_CODES = [
  "RECEPTIONIST",
  "SURVEYOR",
  "OPERATIONS",
  "SUPERVISOR",
  "MANAGER",
  "INSTALL_PLANNER"
] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

export type DashboardSummary = {
  totalOpen: number;
  waitingSurveyorReview: number;
  slaOverdue: number;
  staleJobs: number;
};
