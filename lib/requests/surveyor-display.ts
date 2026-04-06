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

function normalizeSurveyorNameParts(fullName: string): string[] {
  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((part) => !['นาย', 'นาง', 'นางสาว', 'mr.', 'mrs.', 'ms.'].includes(part.toLowerCase()));
}

export function getSurveyorShortDisplayName(fullName: string): string {
  const parts = normalizeSurveyorNameParts(fullName);

  if (parts.length === 0) {
    return '-';
  }

  return parts[0];
}

export function getSurveyorShortDisplayNames(fullNames: string[]): Map<string, string> {
  const partsByName = new Map<string, string[]>();

  for (const fullName of fullNames) {
    partsByName.set(fullName, normalizeSurveyorNameParts(fullName));
  }

  const firstNameCounter = new Map<string, number>();
  for (const fullName of fullNames) {
    const firstName = partsByName.get(fullName)?.[0] ?? '';
    if (!firstName) {
      continue;
    }

    firstNameCounter.set(firstName, (firstNameCounter.get(firstName) ?? 0) + 1);
  }

  const displayNameByFullName = new Map<string, string>();
  for (const fullName of fullNames) {
    const parts = partsByName.get(fullName) ?? [];
    const firstName = parts[0];
    if (!firstName) {
      displayNameByFullName.set(fullName, '-');
      continue;
    }

    const duplicateCount = firstNameCounter.get(firstName) ?? 0;
    if (duplicateCount <= 1) {
      displayNameByFullName.set(fullName, firstName);
      continue;
    }

    const secondPart = parts[1];
    if (!secondPart) {
      displayNameByFullName.set(fullName, firstName);
      continue;
    }

    displayNameByFullName.set(fullName, `${firstName} ${secondPart[0]}.`);
  }

  return displayNameByFullName;
}
