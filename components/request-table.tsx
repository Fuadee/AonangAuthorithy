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
  presentation?: 'table' | 'grid';
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
  actionColumnLabel,
  presentation = 'table'
}: RequestTableProps) {
  const resolvedActionColumnLabel = actionColumnLabel ?? (actionColumnMode === 'workflow' ? 'จัดการ' : 'สถานะ');
  const hasSeparateStatusColumn = actionColumnMode === 'workflow';
  const totalColumns = hasSeparateStatusColumn ? 7 : 6;


  if (presentation === 'grid' && hasSeparateStatusColumn) {
    return (
      <div className="mt-6 space-y-3">
        <div className="hidden grid-cols-[minmax(240px,2.2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(140px,1fr)_minmax(190px,1.2fr)_152px] items-center gap-4 px-4 text-xs font-semibold tracking-wide text-slate-500 uppercase lg:grid">
          <p>Request / ลูกค้า</p>
          <p>ประเภท</p>
          <p>ผู้รับผิดชอบ</p>
          <p>วันนัดสำรวจ</p>
          <p>สถานะ</p>
          <p className="text-right">{resolvedActionColumnLabel}</p>
        </div>

        {requests.map((request) => {
          const dispatchSubStatus = getDispatchSubStatus(request);
          const workflowActions = getQueueWorkflowActions(request);
          const hasAction = workflowActions.length > 0;

          return (
            <article
              key={request.id}
              className="grid gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:border-slate-300 hover:shadow-md lg:grid-cols-[minmax(240px,2.2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(140px,1fr)_minmax(190px,1.2fr)_152px] lg:items-center lg:gap-5"
            >
              <div className="min-h-14 space-y-1">
                <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase lg:hidden">Request / ลูกค้า</p>
                <Link
                  href={`/requests/${request.id}`}
                  className="block truncate text-sm font-semibold text-[#1E3A8A] hover:underline"
                  title={request.request_no}
                >
                  {request.request_no}
                </Link>
                <p className="truncate text-sm text-slate-700" title={request.customer_name}>{request.customer_name}</p>
              </div>

              <div className="min-h-14 space-y-1">
                <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase lg:hidden">ประเภท</p>
                <p className="text-sm text-slate-700">{REQUEST_TYPE_LABELS[request.request_type]}</p>
              </div>

              <div className="min-h-14 space-y-1">
                <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase lg:hidden">ผู้รับผิดชอบ</p>
                <p className="truncate text-sm text-slate-700" title={request.assignee_name}>{request.assignee_name}</p>
              </div>

              <div className="min-h-14 space-y-1">
                <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase lg:hidden">วันนัดสำรวจ</p>
                <p className="text-sm text-slate-700">{formatSurveyDate(getCurrentSurveyDate(request))}</p>
              </div>

              <div className="flex min-h-14 flex-col justify-center">
                <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase lg:hidden">สถานะ</p>
                <RequestStatusBadge status={request.status} />
                <p className="mt-1 min-h-4 text-xs text-slate-500">{dispatchSubStatus ?? '\u00a0'}</p>
              </div>

              <div className="flex min-h-14 flex-col items-end justify-center">
                <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase lg:hidden">{resolvedActionColumnLabel}</p>
                <div className="flex min-h-10 w-full justify-end">
                  {hasAction ? (
                    <div className="w-full min-w-[152px] [&_button]:min-w-[152px] [&_button]:justify-center [&_details>summary]:min-w-[152px] [&_summary]:justify-center">
                      <WorkflowActionButtons
                        actions={workflowActions}
                        compact
                        currentStatus={request.status}
                        maxVisibleActions={1}
                        requestId={request.id}
                        stayOnQueue
                      />
                    </div>
                  ) : (
                    <div className="flex min-h-10 min-w-[152px] items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
                      -
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {!requests.length ? <div className="card px-4 py-8 text-center text-sm text-[#64748B]">{emptyMessage}</div> : null}
      </div>
    );
  }

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
