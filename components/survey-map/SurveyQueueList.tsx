'use client';

import { SurveyQueueCard } from '@/components/survey-map/SurveyQueueCard';
import type { SurveyQueueRequest } from '@/components/survey-map/types';

type SurveyQueueListProps = {
  requests: SurveyQueueRequest[];
  selectedRequestId: string | null;
  onSelect: (id: string) => void;
  onViewOnMap: (id: string) => void;
  onHide: (id: string) => void;
};

export function SurveyQueueList({ requests, selectedRequestId, onSelect, onViewOnMap, onHide }: SurveyQueueListProps) {
  if (!requests.length) {
    return <div className="card p-6 text-center text-sm text-slate-500">ไม่พบงานที่แสดงผลในคิวนี้</div>;
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <SurveyQueueCard
          key={request.id}
          request={request}
          selected={request.id === selectedRequestId}
          onSelect={onSelect}
          onViewOnMap={onViewOnMap}
          onHide={onHide}
        />
      ))}
    </div>
  );
}
