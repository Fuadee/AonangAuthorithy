export const SURVEYOR_CODE_TO_DISPLAY_NAME = {
  STAFF_A: 'นาย เดชา เกาะกลาง',
  STAFF_B: 'นาย ชัยยุทธ สายนุ้ย'
} as const;

const LEGACY_SURVEYOR_ALIASES: Record<string, string> = {
  'นาย A': SURVEYOR_CODE_TO_DISPLAY_NAME.STAFF_A,
  'นาย B': SURVEYOR_CODE_TO_DISPLAY_NAME.STAFF_B
};

export function getSurveyorDisplayName(code?: string | null): string {
  if (!code) {
    return '-';
  }

  const normalized = code.trim();
  if (!normalized) {
    return '-';
  }

  if (normalized in SURVEYOR_CODE_TO_DISPLAY_NAME) {
    return SURVEYOR_CODE_TO_DISPLAY_NAME[normalized as keyof typeof SURVEYOR_CODE_TO_DISPLAY_NAME];
  }

  if (normalized in LEGACY_SURVEYOR_ALIASES) {
    return LEGACY_SURVEYOR_ALIASES[normalized];
  }

  return normalized;
}

export function getSurveyorDisplayNameFromAssignee(assignee: { code?: string | null; name?: string | null }): string {
  const fromCode = getSurveyorDisplayName(assignee.code);
  if (fromCode !== '-') {
    return fromCode;
  }

  return getSurveyorDisplayName(assignee.name);
}
