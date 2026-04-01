import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { requirePermission } from "@/lib/guards/auth";
import { getAgingBuckets, getDashboardSummary, getOverdueRequests, type OverdueRequest } from "@/lib/queries/dashboard";

export default async function DashboardPage() {
  await requirePermission("dashboard.view");
  const [summary, aging, overdue] = await Promise.all([getDashboardSummary(), getAgingBuckets(), getOverdueRequests(15)]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Manager Dashboard</h1>
      <DashboardCards summary={summary} />
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">Aging ตามสถานะ</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th>สถานะ</th>
              <th>รวม</th>
              <th>&gt;1 วัน</th>
              <th>&gt;3 วัน</th>
              <th>&gt;7 วัน</th>
            </tr>
          </thead>
          <tbody>
            {aging.map((row: Record<string, string | number>) => (
              <tr key={String(row.current_status)} className="border-t">
                <td>{String(row.current_status)}</td>
                <td>{Number(row.total)}</td>
                <td>{Number(row.gt_1d)}</td>
                <td>{Number(row.gt_3d)}</td>
                <td>{Number(row.gt_7d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">งานเกิน SLA ล่าสุด</h2>
        <ul className="space-y-2 text-sm">
          {overdue.map((job: OverdueRequest) => (
            <li key={job.request_id} className="rounded border p-2">
              <span className="font-medium">{job.request_no}</span> - {job.current_status}
            </li>
          ))}
          {overdue.length === 0 && <li className="text-slate-500">ไม่พบงานเกิน SLA</li>}
        </ul>
      </div>
    </div>
  );
}
