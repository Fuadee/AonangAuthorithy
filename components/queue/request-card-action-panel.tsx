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
};

export function RequestCardActionPanel({ requestId, detailHref, currentStatus, actions }: RequestCardActionPanelProps) {
  if (!actions.length) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-slate-500">สถานะนี้ต้องดำเนินการผ่านหน้า detail</p>
        <Link className="btn-secondary min-h-10 whitespace-nowrap px-3 py-2 text-sm" href={detailHref}>
          ดูรายละเอียด
        </Link>
      </div>
    );
  }

  return <WorkflowActionButtons actions={actions} currentStatus={currentStatus} detailHref={detailHref} requestId={requestId} stayOnQueue />;
}
