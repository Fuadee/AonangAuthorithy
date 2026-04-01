import { reviewDocumentAction } from "@/app/actions/request-actions";

export function DocumentReviewForm({ requestId }: { requestId: string }) {
  return (
    <form action={reviewDocumentAction} className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
      <input type="hidden" name="requestId" value={requestId} />
      <label className="block text-sm font-medium">ผลการตรวจเอกสาร</label>
      <select className="w-full rounded border p-2" name="decision" defaultValue="READY">
        <option value="READY">เอกสารครบ พร้อมสำรวจ</option>
        <option value="INCOMPLETE">เอกสารไม่ครบ</option>
        <option value="NEED_INFO">ต้องการข้อมูลเพิ่มเติม</option>
      </select>
      <textarea className="w-full rounded border p-2" name="missingItems" placeholder="ระบุเอกสารที่ขาด (1 บรรทัดต่อ 1 รายการ)" />
      <textarea className="w-full rounded border p-2" name="note" placeholder="หมายเหตุ" />
      <button type="submit" className="rounded bg-emerald-600 px-4 py-2 text-white">
        ยืนยันผลตรวจเอกสาร
      </button>
    </form>
  );
}
