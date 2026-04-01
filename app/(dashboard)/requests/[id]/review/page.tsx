import { DocumentReviewForm } from "@/components/requests/document-review-form";
import { requirePermission } from "@/lib/guards/auth";

export default async function DocumentReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("request.document_review");
  const { id } = await params;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">ตรวจเอกสารโดยผู้สำรวจ</h1>
      <DocumentReviewForm requestId={id} />
    </div>
  );
}
