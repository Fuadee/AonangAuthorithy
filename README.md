# Aonang Authority Workflow

Scaffold สำหรับระบบบริหารคำร้องผู้ใช้ไฟฟ้าแบบ workflow-based ด้วย Next.js + Supabase

## สิ่งที่ scaffold รอบนี้ (ตามลำดับที่ขอ)

1. **Auth + Role Guard**
   - บังคับ login ที่ dashboard layout
   - ตรวจ permission ตาม RBAC ก่อนเข้าหน้า/รัน action
   - ไฟล์หลัก: `lib/guards/auth.ts`, `app/(dashboard)/layout.tsx`

2. **Create Service Request**
   - หน้า `/requests/new` + server action `createRequestAction`
   - บันทึกคำร้องใหม่, กำหนด owner, ใส่ activity + status history เริ่มต้น

3. **Assign Surveyor**
   - หน้า detail มีฟอร์ม assign ผู้สำรวจ
   - เรียก DB function `assign_request_owner` + transition ไป `WAITING_SURVEYOR_DOCUMENT_REVIEW`

4. **Surveyor Document Review**
   - หน้า `/requests/[id]/review` + server action `reviewDocumentAction`
   - รองรับ READY / INCOMPLETE / NEED_INFO
   - กรณี INCOMPLETE บังคับ missing items

5. **Request Detail + Timeline**
   - หน้า `/requests/[id]`
   - ดึงข้อมูล request, owner ปัจจุบัน, assignment history, timeline

6. **Manager Dashboard**
   - หน้า `/dashboard`
   - summary cards + aging buckets + รายการงานเกิน SLA

## โครงสร้างที่สำคัญ

- `app/actions/request-actions.ts` : create / assign / review actions
- `lib/workflow/constants.ts` : transition matrix + permissions
- `lib/workflow/service.ts` : transition ผ่าน RPC (`transition_service_request`)
- `lib/queries/dashboard.ts` : manager dashboard queries
- `lib/queries/requests.ts` : request detail + surveyor options
- `supabase/migrations/0001_init.sql` : schema, constraints, indexes, workflow functions, views
- `supabase/seed/0001_seed.sql` : seed roles + SLA policies

## Run

```bash
npm install
npm run dev
```

> ถ้าเชื่อม Supabase จริง ให้สร้าง `.env.local` จาก `.env.example`
