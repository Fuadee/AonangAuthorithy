import type { SurveyQueueRequest } from '@/components/survey-map/types';
import { getSurveyorDisplayName } from '@/lib/requests/surveyor-display';

export const ALL_SURVEYORS_VALUE = '__ALL__';

export function normalizeSurveyorName(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

export function getSurveyorName(request: Pick<SurveyQueueRequest, 'assigned_surveyor'>): string | null {
  return normalizeSurveyorName(request.assigned_surveyor);
}

export function getSurveyorDisplayNameByRaw(value: string | null | undefined): string {
  return getSurveyorDisplayName(value);
}

export function getAvailableSurveyors(requests: SurveyQueueRequest[]): string[] {
  const surveyorSet = new Set<string>();

  requests.forEach((request) => {
    const surveyorName = getSurveyorName(request);
    if (surveyorName) {
      surveyorSet.add(surveyorName);
    }
  });

  return Array.from(surveyorSet).sort((a, b) => a.localeCompare(b, 'th'));
}

export function isAllSurveyors(value: string): boolean {
  return value === ALL_SURVEYORS_VALUE;
}

export function resolveDefaultSurveyorSelection(options: string[], querySurveyor?: string | null): string {
  const normalizedQuery = normalizeSurveyorName(querySurveyor);
  if (normalizedQuery && options.includes(normalizedQuery)) {
    return normalizedQuery;
  }

  if (!options.length) {
    return ALL_SURVEYORS_VALUE;
  }

  return options[0];
}

export function filterRequestsBySurveyor(requests: SurveyQueueRequest[], selectedSurveyor: string): SurveyQueueRequest[] {
  if (isAllSurveyors(selectedSurveyor)) {
    return requests;
  }

  return requests.filter((request) => getSurveyorName(request) === selectedSurveyor);
}
