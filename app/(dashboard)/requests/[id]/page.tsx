import { AssignSurveyorForm } from "@/components/requests/assign-surveyor-form";
import { RequestTimeline } from "@/components/requests/request-timeline";
import { requirePermission } from "@/lib/guards/auth";
import { getRequestDetail, getSurveyorsByArea } from "@/lib/queries/requests";

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("request.assign");
  const { id } = await params;
  const detail = await getRequestDetail(id);

  if (!detail.request) {
    return <div className="rounded-xl bg-white p-4">ไม่พบงาน</div>;
  }

  const surveyors = await getSurveyorsByArea(detail.request.area_code);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">รายละเอียดงาน {detail.request.request_no}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p><span className="font-medium">ลูกค้า:</span> {detail.request.customer_name}</p>
          <p><span className="font-medium">เบอร์โทร:</span> {detail.request.customer_phone}</p>
          <p><span className="font-medium">ประเภท:</span> {detail.request.request_type}</p>
          <p><span className="font-medium">สถานะ:</span> {detail.request.current_status}</p>
          <p><span className="font-medium">Owner:</span> {detail.request.current_owner?.full_name}</p>
        </div>
        <AssignSurveyorForm requestId={id} surveyors={surveyors} />
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">Assignment History</h2>
        <ul className="space-y-2 text-sm">
          {detail.assignments.map((item, idx) => (
            <li key={idx} className="rounded border p-2">{JSON.stringify(item)}</li>
          ))}
          {detail.assignments.length === 0 && <li className="text-slate-500">ยังไม่มีการมอบหมาย</li>}
        </ul>
      </div>

      <RequestTimeline activities={detail.timeline} />
    </div>
  );
}
