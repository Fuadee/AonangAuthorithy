import { RequestStatus, ServiceRequest, getRequestStatusLabel } from '@/lib/requests/types';

export const DOCUMENT_SUMMARY_KEYS = ['ALL', 'NEEDS_FIX', 'WAITING_KRABI_DISPATCH', 'WAITING_DOCUMENT_CHECK'] as const;

export type DocumentSummaryKey = (typeof DOCUMENT_SUMMARY_KEYS)[number];

export type DocumentSummaryDefinition = {
  key: DocumentSummaryKey;
  label: string;
  statuses: RequestStatus[];
  emphasis?: 'default' | 'warning';
};

export const DOCUMENT_SUMMARY_DEFINITIONS: DocumentSummaryDefinition[] = [
  {
    key: 'ALL',
    label: 'งานเอกสารทั้งหมด',
    statuses: []
  },
  {
    key: 'NEEDS_FIX',
    label: 'เอกสารตีกลับให้แก้',
    statuses: ['KRABI_NEEDS_DOCUMENT_FIX'],
    emphasis: 'warning'
  },
  {
    key: 'WAITING_KRABI_DISPATCH',
    label: 'รอส่งกระบี่',
    statuses: ['WAITING_TO_SEND_TO_KRABI', 'SENT_TO_KRABI']
  },
  {
    key: 'WAITING_DOCUMENT_CHECK',
    label: 'รอตรวจเอกสาร',
    statuses: ['WAIT_KRABI_DOCUMENT_CHECK']
  }
];

const DOCUMENT_SUMMARY_MAP = new Map<DocumentSummaryKey, DocumentSummaryDefinition>(
  DOCUMENT_SUMMARY_DEFINITIONS.map((item) => [item.key, item])
);

export function isDocumentSummaryKey(value: string | undefined): value is DocumentSummaryKey {
  if (!value) {
    return false;
  }

  return DOCUMENT_SUMMARY_MAP.has(value as DocumentSummaryKey);
}

export function getDocumentSummaryDefinition(key: DocumentSummaryKey): DocumentSummaryDefinition {
  return DOCUMENT_SUMMARY_MAP.get(key) ?? DOCUMENT_SUMMARY_DEFINITIONS[0];
}

export function getDocumentSummaryCounts(requests: ServiceRequest[]): Array<DocumentSummaryDefinition & { count: number; statusHint: string }> {
  return DOCUMENT_SUMMARY_DEFINITIONS.map((definition) => {
    const count = definition.key === 'ALL' ? requests.length : requests.filter((request) => definition.statuses.includes(request.status)).length;
    const statusHint =
      definition.key === 'ALL'
        ? 'ทุกสถานะในคิวเอกสาร'
        : definition.statuses.map((status) => getRequestStatusLabel(status)).join(' • ');

    return {
      ...definition,
      count,
      statusHint
    };
  });
}
