export default function SurveyMapLoading() {
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <p className="text-sm text-slate-500">กำลังโหลดคิวสำรวจบนแผนที่...</p>
      </div>
      <div className="card h-80 animate-pulse bg-slate-100" />
    </div>
  );
}
