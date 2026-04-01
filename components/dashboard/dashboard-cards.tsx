import type { DashboardSummary } from "@/types/domain";

export function DashboardCards({ summary }: { summary: DashboardSummary }) {
  const cards = [
    { label: "งานเปิดทั้งหมด", value: summary.totalOpen },
    { label: "รอผู้สำรวจตรวจเอกสาร", value: summary.waitingSurveyorReview },
    { label: "งานเกิน SLA", value: summary.slaOverdue },
    { label: "งานไม่มีความเคลื่อนไหว", value: summary.staleJobs }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">{card.label}</p>
          <p className="mt-2 text-2xl font-bold">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
