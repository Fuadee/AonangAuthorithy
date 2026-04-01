import { RequestCreateForm } from "@/components/requests/request-create-form";
import { requirePermission } from "@/lib/guards/auth";

export default async function NewRequestPage() {
  await requirePermission("request.create");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">รับคำร้องใหม่</h1>
      <RequestCreateForm />
    </div>
  );
}
