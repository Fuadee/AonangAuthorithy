# Electricity Service Request MVP (Next.js + Supabase)

ระบบ MVP งานคำร้องผู้ใช้ไฟฟ้าแบบใหม่ โดยใช้ **Next.js + Supabase (Postgres)** เป็นแกนหลักเท่านั้น

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres)

## Features (MVP)
- Dashboard `/dashboard`
  - สรุปจำนวนคำร้องทั้งหมด
  - สรุปจำนวนคำร้องสถานะ `NEW`
  - ตารางรายการคำร้องทั้งหมดเรียงจากใหม่ไปเก่า
- Create Request `/requests/new`
  - ฟอร์มสร้างคำร้องใหม่
  - เลือกพื้นที่และผู้รับผิดชอบจากฐานข้อมูล
- Request Detail `/requests/[id]`
  - ดูรายละเอียดคำร้อง
  - เปลี่ยนสถานะคำร้อง
  - เปลี่ยนผู้รับผิดชอบคำร้อง

## Setup
1. ติดตั้ง dependencies
```bash
npm install
```

2. สร้างไฟล์ `.env.local` จาก `.env.example` แล้วใส่ค่า Supabase
```bash
cp .env.example .env.local
```

3. รัน SQL ที่ Supabase
- รัน `supabase/schema.sql`
- รัน `supabase/seed.sql`

4. เริ่มระบบ
```bash
npm run dev
```

เปิดที่ `http://localhost:3000`

## Database files
- `supabase/schema.sql`
- `supabase/seed.sql`

## หมายเหตุ
- ไม่มี SQLite
- ไม่มี Python backend เป็น runtime หลัก
- รอบนี้ intentionally ยังไม่ทำ auth, workflow ซับซ้อน, audit log
