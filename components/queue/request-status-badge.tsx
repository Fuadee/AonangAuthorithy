import { getRequestStatusLabelForDisplay, RequestStatus, ServiceRequest } from '@/lib/requests/types';
import { getRequestStatusToneClassForDisplay } from '@/lib/requests/status-style';

type RequestStatusBadgeProps = {
  status: RequestStatus;
  surveyFailureType?: ServiceRequest['survey_failure_type'];
  className?: string;
};

export function RequestStatusBadge({ status, surveyFailureType = null, className = '' }: RequestStatusBadgeProps) {
  const displayMeta = { status, survey_failure_type: surveyFailureType };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getRequestStatusToneClassForDisplay(displayMeta)} ${className}`.trim()}>
      {getRequestStatusLabelForDisplay(displayMeta)}
    </span>
  );
}
