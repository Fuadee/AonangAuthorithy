'use client';

import Link from 'next/link';
import { RequestStatusBadge } from '@/components/queue/request-status-badge';
import { WorkflowActionButtons } from '@/components/workflow-action-buttons';
import { getQueueWorkflowActions } from '@/lib/requests/workflow-action-config';
import {
  getCurrentSurveyDate,
  getDispatchSubStatus,
  REQUEST_TYPE_LABELS,
  ServiceRequest
} from '@/lib/requests/types';

type RequestTableProps = {
  requests: ServiceRequest[];
  emptyMessage?: string;
  actionColumnMode?: 'status' | 'workflow';
  actionColumnLabel?: string;
};

function formatSurveyDate(value: string | null): string {
  if (!value) {
    return '-';
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString('th-TH', { dateStyle: 'medium' });
}

export function RequestTable({
  requests,
  emptyMessage = 'ยังไม่มีคำร้อง',
  actionColumnMode = 'status',
  actionColumnLabel
}: RequestTableProps) {
  const resolvedActionColumnLabel = actionColumnLabel ?? (actionColumnMode === 'workflow' ? 'จัดการ' : 'สถานะ');
  const hasSeparateStatusColumn = actionColumnMode === 'workflow';
  const totalColumns = hasSeparateStatusColumn ? 7 : 6;

  return (
    <div className="card mt-6 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
          <colgroup>
            <col className={hasSeparateStatusColumn ? 'w-[14%]' : 'w-[16%]'} />
            <col className={hasSeparateStatusColumn ? 'w-[22%]' : 'w-[31%]'} />
            <col className={hasSeparateStatusColumn ? 'w-[12%]' : 'w-[14%]'} />
            <col className={hasSeparateStatusColumn ? 'w-[12%]' : 'w-[15%]'} />
            <col className={hasSeparateStatusColumn ? 'w-[14%]' : 'w-[13%]'} />
            {hasSeparateStatusColumn ? <col className="w-[16%]" /> : null}
            <col className="w-[10%] min-w-[160px]" />
          </colgroup>
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 align-middle text-sm font-medium text-[#64748B]">Request No.</th>
              <th className="px-4 py-3 align-middle text-sm font-medium text-[#64748B]">ลูกค้า</th>
              <th className="whitespace-nowrap px-4 py-3 align-middle text-sm font-medium text-[#64748B]">ประเภท</th>
              <th className="whitespace-nowrap px-4 py-3 align-middle text-sm font-medium text-[#64748B]">ผู้รับผิดชอบ</th>
              <th className="whitespace-nowrap px-4 py-3 align-middle text-sm font-medium text-[#64748B]">วันนัดสำรวจ</th>
              {hasSeparateStatusColumn ? <th className="whitespace-nowrap px-4 py-3 align-middle text-sm font-medium text-[#64748B]">สถานะ</th> : null}
              <th className="whitespace-nowrap px-4 py-3 align-middle text-center text-sm font-medium text-[#64748B]">{resolvedActionColumnLabel}</th>
            </tr>
          </thead>
          <tbody className="bg-white text-[#0F172A]">
            {requests.map((request) => {
              const dispatchSubStatus = getDispatchSubStatus(request);

              return (
                <tr key={request.id} className="border-b border-[#E2E8F0] hover:bg-slate-50">
                  <td className="max-w-0 px-4 py-3 align-middle" title={request.request_no}>
                    <Link
                      href={`/requests/${request.id}`}
                      className="block truncate whitespace-nowrap font-semibold text-[#1E3A8A] hover:underline"
                    >
                      {request.request_no}
                    </Link>
                  </td>
                  <td className="max-w-0 px-4 py-3 align-middle" title={request.customer_name}>
                    <p className="truncate text-[#0F172A]">{request.customer_name}</p>
                  </td>
                  <td className="max-w-0 px-4 py-3 align-middle" title={REQUEST_TYPE_LABELS[request.request_type]}>
                    <p className="truncate whitespace-nowrap text-[#64748B]">{REQUEST_TYPE_LABELS[request.request_type]}</p>
                  </td>
                  <td className="max-w-0 px-4 py-3 align-middle" title={request.assignee_name}>
                    <p className="truncate whitespace-nowrap text-[#64748B]">{request.assignee_name}</p>
                  </td>
                  <td className="max-w-0 px-4 py-3 align-middle">
                    <p className="truncate whitespace-nowrap text-[#64748B]">{formatSurveyDate(getCurrentSurveyDate(request))}</p>
                  </td>
                  {hasSeparateStatusColumn ? (
                    <td className="max-w-0 px-4 py-3 align-middle">
                      <div className="space-y-1">
                        <RequestStatusBadge status={request.status} />
                        {dispatchSubStatus ? (
                          <p className="truncate text-xs text-slate-600" title={dispatchSubStatus}>
                            {dispatchSubStatus}
                          </p>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                  <td className="px-4 py-3 align-middle text-center">
                    {actionColumnMode === 'workflow' ? (
                      <div className="flex min-h-10 items-center justify-center [&_button]:min-w-[136px] [&_summary]:min-w-[136px]">
                        <WorkflowActionButtons
                          actions={getQueueWorkflowActions(request)}
                          compact
                          currentStatus={request.status}
                          maxVisibleActions={1}
                          requestId={request.id}
                          stayOnQueue
                        />
                      </div>
                    ) : (
                      <RequestStatusBadge status={request.status} />
                    )}
                  </td>
                </tr>
              );
            })}
            {!requests.length && (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-[#64748B]" colSpan={totalColumns}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
