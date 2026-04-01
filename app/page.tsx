import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-4 rounded-xl bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold">ระบบบริหารคำร้องผู้ใช้ไฟฟ้า</h1>
      <p>Workflow-first เพื่อลดงานหาย งานค้าง เอกสารไม่ครบ และติดตามสถานะได้จริง</p>
      <div className="flex gap-3">
        <Link href="/dashboard" className="rounded bg-blue-600 px-4 py-2 text-white">
          ไปหน้า Dashboard
        </Link>
        <Link href="/requests/new" className="rounded border px-4 py-2">
          สร้างคำร้องใหม่
        </Link>
      </div>
    </div>
  );
}
