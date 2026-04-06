'use client';

import Link from 'next/link';
import { RequestStatusBadge } from '@/components/queue/request-status-badge';
import { WorkflowActionButtons } from '@/components/workflow-action-buttons';
import { getQueueWorkflowActions } from '@/lib/requests/workflow-action-config';
import { resolveAreaDisplayName } from '@/lib/requests/areas';
import {
  getCurrentSurveyDate,
  getDispatchSubStatus,
  getResponsiblePersonName,
  REQUEST_TYPE_LABELS,
  RequestStatus,
  ServiceRequest
} from '@/lib/requests/types';

type RequestTableProps = {
  requests: ServiceRequest[];
  emptyMessage?: string;
  actionColumnMode?: 'status' | 'workflow';
  actionColumnLabel?: string;
  presentation?: 'table' | 'grid';
  dateColumnVariant?: 'survey_date' | 'krabi_dispatch_date';
  responsibleColumnVariant?: 'person' | 'area_with_responsible';
};

function formatSurveyDate(value: string | null): string {
  if (!value) {
    return '-';
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString('th-TH', { dateStyle: 'medium' });
}

type DispatchDateMeta = {
  thaiDate: string;
  ageInDays: number | null;
};

function getDispatchDateMeta(value: string | null): DispatchDateMeta | null {
  if (!value) {
    return null;
  }

  const sentAt = new Date(value);
  if (Number.isNaN(sentAt.valueOf())) {
    return null;
  }

  const thaiDate = sentAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  const ageInDays = Math.floor((Date.now() - sentAt.getTime()) / (24 * 60 * 60 * 1000));

  return {
    thaiDate,
    ageInDays: ageInDays >= 0 ? ageInDays : null
  };
}

function getDispatchAgeBadgeClass(ageInDays: number): string {
  if (ageInDays <= 2) {
    return 'bg-green-100 text-green-700';
  }

  if (ageInDays <= 5) {
    return 'bg-yellow-100 text-yellow-700';
  }

  return `bg-red-100 text-red-700${ageInDays > 5 ? ' font-semibold' : ''}`;
}

const EMPHASIZED_ROW_STATUSES: RequestStatus[] = ['KRABI_NEEDS_DOCUMENT_FIX', 'WAIT_CUSTOMER_FIX'];

export function RequestTable({
  requests,
  emptyMessage = 'ยังไม่มีคำร้อง',
  actionColumnMode = 'status',
  actionColumnLabel,
  presentation = 'table',
  dateColumnVariant = 'survey_date',
  responsibleColumnVariant = 'person'
}: RequestTableProps) {
  const resolvedActionColumnLabel = actionColumnLabel ?? (actionColumnMode === 'workflow' ? 'จัดการ' : 'สถานะ');
  const hasSeparateStatusColumn = actionColumnMode === 'workflow';
  const totalColumns = hasSeparateStatusColumn ? 7 : 6;
  const dateColumnLabel = dateColumnVariant === 'krabi_dispatch_date' ? 'วันที่ส่งเอกสาร' : 'วันนัดสำรวจ';


  if (presentation === 'grid' && hasSeparateStatusColumn) {
    return (
      <div className="mt-6 space-y-3">
          <div className="hidden grid-cols-[minmax(240px,2.2fr)_minmax(120px,1fr)_minmax(180px,1.2fr)_minmax(140px,1fr)_minmax(190px,1.2fr)_152px] items-center gap-4 px-4 text-xs font-semibold tracking-wide text-slate-500 uppercase lg:grid">
            <p>Request / ลูกค้า</p>
            <p>ประเภท</p>
            <p>{responsibleColumnVariant === 'area_with_responsible' ? 'พื้นที่' : 'ผู้รับผิดชอบ'}</p>
            <p>{dateColumnLabel}</p>
            <p>สถานะ</p>
            <p className="text-right">{resolvedActionColumnLabel}</p>
        </div>

        {requests.map((request) => {
          const responsiblePersonName = getResponsiblePersonName(request);
          const dispatchSubStatus = getDispatchSubStatus(request);
          const workflowActions = getQueueWorkflowActions(request);
          const hasAction = workflowActions.length > 0;
          const dispatchDateMeta = getDispatchDateMeta(request.dispatched_to_krabi_at);

          return (
            <article
              key={request.id}
              className="grid gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:border-slate-300 hover:shadow-md lg:grid-cols-[minmax(240px,2.2fr)_minmax(120px,1fr)_minmax(180px,1.2fr)_minmax(140px,1fr)_minmax(190px,1.2fr)_152px] lg:items-center lg:gap-5"
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
                <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase lg:hidden">
                  {responsibleColumnVariant === 'area_with_responsible' ? 'พื้นที่' : 'ผู้รับผิดชอบ'}
                </p>
                {responsibleColumnVariant === 'area_with_responsible' ? (
                  <div className="space-y-0.5">
                    <p className="truncate text-sm font-medium text-slate-800" title={resolveAreaDisplayName(request.area_name)}>
                      {resolveAreaDisplayName(request.area_name)}
                    </p>
                    <p className="truncate text-sm text-muted-foreground" title={`ผู้รับผิดชอบ: ${responsiblePersonName}`}>
                      ผู้รับผิดชอบ: {responsiblePersonName}
                    </p>
                  </div>
                ) : (
                  <p className="truncate text-sm text-slate-700" title={responsiblePersonName}>{responsiblePersonName}</p>
                )}
              </div>

              <div className="min-h-14 space-y-1">
                <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase lg:hidden">{dateColumnLabel}</p>
                {dateColumnVariant === 'krabi_dispatch_date' ? (
                  dispatchDateMeta ? (
                    <div className="flex flex-col gap-1">
                      <p className="text-sm text-gray-900">{dispatchDateMeta.thaiDate}</p>
                      {dispatchDateMeta.ageInDays !== null ? (
                        <span
                          className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${getDispatchAgeBadgeClass(dispatchDateMeta.ageInDays)}`}
                        >
                          ค้าง {dispatchDateMeta.ageInDays} วัน
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900">-</p>
                  )
                ) : (
                  <p className="text-sm text-slate-700">{formatSurveyDate(getCurrentSurveyDate(request))}</p>
                )}
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
      <div className="overflow-x-auto lg:overflow-x-visible">
        <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
          <colgroup>
            <col className={hasSeparateStatusColumn ? 'w-[12%]' : 'w-[16%]'} />
            <col className={hasSeparateStatusColumn ? 'w-[16%]' : 'w-[20%]'} />
            <col className={hasSeparateStatusColumn ? 'w-[10%]' : 'w-[12%]'} />
            <col className={hasSeparateStatusColumn ? (responsibleColumnVariant === 'area_with_responsible' ? 'w-[20%]' : 'w-[12%]') : 'w-[20%]'} />
            <col className={hasSeparateStatusColumn ? 'w-[11%]' : 'w-[13%]'} />
            {hasSeparateStatusColumn ? <col className="w-[19%]" /> : null}
            <col className={hasSeparateStatusColumn ? 'w-[12%]' : 'w-[19%]'} />
          </colgroup>
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="whitespace-nowrap px-3 py-3 align-middle text-sm font-medium text-[#64748B]">Request No.</th>
              <th className="px-3 py-3 align-middle text-sm font-medium text-[#64748B]">ลูกค้า</th>
              <th className="whitespace-nowrap px-3 py-3 align-middle text-sm font-medium text-[#64748B]">ประเภท</th>
              <th className="whitespace-nowrap px-3 py-3 align-middle text-sm font-medium text-[#64748B]">
                {responsibleColumnVariant === 'area_with_responsible' ? 'พื้นที่' : 'ผู้รับผิดชอบ'}
              </th>
              <th className="whitespace-nowrap px-3 py-3 align-middle text-sm font-medium text-[#64748B]">{dateColumnLabel}</th>
              {hasSeparateStatusColumn ? <th className="whitespace-nowrap px-3 py-3 align-middle text-sm font-medium text-[#64748B]">สถานะ</th> : null}
              <th className="whitespace-nowrap px-3 py-3 align-middle text-center text-sm font-semibold text-slate-700">
                {resolvedActionColumnLabel}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white text-[#0F172A]">
            {requests.map((request) => {
              const responsiblePersonName = getResponsiblePersonName(request);
              const dispatchSubStatus = getDispatchSubStatus(request);
              const isEmphasizedRow = EMPHASIZED_ROW_STATUSES.includes(request.status);
              const dispatchDateMeta = getDispatchDateMeta(request.dispatched_to_krabi_at);

              return (
                <tr
                  key={request.id}
                  className={`border-b border-[#E2E8F0] hover:bg-slate-50 ${isEmphasizedRow ? 'bg-rose-50/50 hover:bg-rose-100/50' : ''}`}
                >
                  <td className="max-w-0 px-3 py-3 align-middle" title={request.request_no}>
                    <Link
                      href={`/requests/${request.id}`}
                      className="block truncate whitespace-nowrap pr-1 font-semibold text-[#1E3A8A] hover:underline"
                    >
                      {request.request_no}
                    </Link>
                  </td>
                  <td className="max-w-0 px-3 py-3 align-middle" title={request.customer_name}>
                    <p className="max-w-[180px] truncate text-[#0F172A] lg:max-w-[220px]">{request.customer_name}</p>
                  </td>
                  <td className="max-w-0 px-3 py-3 align-middle" title={REQUEST_TYPE_LABELS[request.request_type]}>
                    <p className="truncate whitespace-nowrap text-[#64748B]">{REQUEST_TYPE_LABELS[request.request_type]}</p>
                  </td>
                  <td className="max-w-0 px-3 py-3 align-middle">
                    {responsibleColumnVariant === 'area_with_responsible' ? (
                      <div className="space-y-0.5">
                        <p className="truncate text-sm font-medium text-slate-800" title={resolveAreaDisplayName(request.area_name)}>
                          {resolveAreaDisplayName(request.area_name)}
                        </p>
                        <p className="truncate text-sm text-muted-foreground" title={`ผู้รับผิดชอบ: ${responsiblePersonName}`}>
                          ผู้รับผิดชอบ: {responsiblePersonName}
                        </p>
                      </div>
                    ) : (
                      <p className="truncate whitespace-nowrap text-[#64748B]" title={responsiblePersonName}>
                        {responsiblePersonName}
                      </p>
                    )}
                  </td>
                  <td className="max-w-0 px-3 py-3 align-middle">
                    {dateColumnVariant === 'krabi_dispatch_date' ? (
                      dispatchDateMeta ? (
                        <div className="flex flex-col gap-1">
                          <p className="truncate text-sm text-gray-900" title={dispatchDateMeta.thaiDate}>{dispatchDateMeta.thaiDate}</p>
                          {dispatchDateMeta.ageInDays !== null ? (
                            <span
                              className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${getDispatchAgeBadgeClass(dispatchDateMeta.ageInDays)}`}
                            >
                              ค้าง {dispatchDateMeta.ageInDays} วัน
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-900">-</p>
                      )
                    ) : (
                      <p className="truncate whitespace-nowrap text-[#64748B]">{formatSurveyDate(getCurrentSurveyDate(request))}</p>
                    )}
                  </td>
                  {hasSeparateStatusColumn ? (
                    <td className="max-w-0 px-3 py-3 align-middle">
                      <div className="space-y-1 pr-1">
                        <RequestStatusBadge status={request.status} />
                        {dispatchSubStatus ? (
                          <p className="truncate text-xs leading-4 text-slate-600" title={dispatchSubStatus}>
                            {dispatchSubStatus}
                          </p>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                  <td className="px-3 py-3 align-middle text-center">
                    {actionColumnMode === 'workflow' ? (
                      <div className="flex min-h-10 items-center justify-center [&_button]:min-w-[124px] [&_button]:px-2.5 [&_details>summary]:min-w-[124px] [&_details>summary]:px-2.5 [&_summary]:min-w-[124px] [&_summary]:px-2.5">
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
                      <div className="flex justify-center py-0.5">
                        <RequestStatusBadge status={request.status} className="px-3 py-1.5 text-[12px] font-semibold" />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {!requests.length && (
              <tr>
                <td className="px-3 py-8 text-center text-sm text-[#64748B]" colSpan={totalColumns}>
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
