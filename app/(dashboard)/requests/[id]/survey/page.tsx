export default async function SurveyResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <h1 className="text-xl font-semibold">บันทึกผลสำรวจ #{id}</h1>
      <p className="mt-2 text-sm text-slate-600">เพิ่มฟอร์มบันทึกผลสำรวจ/แนบรูป/ข้อเสนอแนะได้ที่หน้านี้</p>
    </div>
  );
}
