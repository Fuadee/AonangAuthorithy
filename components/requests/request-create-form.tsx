import { createRequestAction } from "@/app/actions/request-actions";

export function RequestCreateForm() {
  return (
    <form action={createRequestAction} className="grid gap-3 rounded-xl bg-white p-5 shadow-sm md:grid-cols-2">
      <input className="rounded border p-2" name="customerName" placeholder="ชื่อลูกค้า" required />
      <input className="rounded border p-2" name="customerPhone" placeholder="เบอร์โทร" required />
      <input className="rounded border p-2" name="areaCode" placeholder="รหัสพื้นที่" required />
      <select className="rounded border p-2" name="requestType" defaultValue="METER">
        <option value="METER">ขอใช้มิเตอร์</option>
        <option value="EXTENSION">ขอขยายเขต</option>
      </select>
      <textarea className="rounded border p-2 md:col-span-2" name="supplyAddress" placeholder="ที่อยู่/จุดใช้ไฟ" required />
      <button className="rounded bg-blue-600 px-4 py-2 text-white md:col-span-2" type="submit">
        บันทึกคำร้อง
      </button>
    </form>
  );
}
