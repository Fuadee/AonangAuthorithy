'use client';

import Link from 'next/link';
import { WorkflowActionButtons } from '@/components/workflow-action-buttons';
import { QueueWorkflowAction } from '@/lib/requests/workflow-action-config';
import { RequestStatus } from '@/lib/requests/types';

type RequestCardActionPanelProps = {
  requestId: string;
  detailHref: string;
  currentStatus: RequestStatus;
  actions: QueueWorkflowAction[];
  compact?: boolean;
};

export function RequestCardActionPanel({ requestId, detailHref, currentStatus, actions, compact = false }: RequestCardActionPanelProps) {
  if (!actions.length) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="text-sm text-slate-500">สถานะนี้ต้องดำเนินการผ่านหน้า detail</p>
        <Link className={`btn-secondary whitespace-nowrap text-sm ${compact ? 'min-h-9 px-2.5 py-1.5' : 'min-h-10 px-3 py-2'}`} href={detailHref}>
          ดูรายละเอียด
        </Link>
      </div>
    );
  }

  return <WorkflowActionButtons actions={actions} compact={compact} currentStatus={currentStatus} detailHref={detailHref} requestId={requestId} stayOnQueue />;
}
