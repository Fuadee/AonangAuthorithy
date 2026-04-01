type Activity = {
  id: number;
  activity_type: string;
  created_at: string;
  payload: Record<string, unknown>;
  actor: { full_name: string } | null;
};

export function RequestTimeline({ activities }: { activities: Activity[] }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-base font-semibold">Timeline</h2>
      <ul className="space-y-3">
        {activities.map((activity) => (
          <li key={activity.id} className="rounded border p-3 text-sm">
            <p className="font-medium">{activity.activity_type}</p>
            <p className="text-slate-600">โดย {activity.actor?.full_name ?? "ระบบ"}</p>
            <p className="text-xs text-slate-500">{new Date(activity.created_at).toLocaleString("th-TH")}</p>
          </li>
        ))}
        {activities.length === 0 && <li className="text-sm text-slate-500">ยังไม่มีกิจกรรม</li>}
      </ul>
    </div>
  );
}
