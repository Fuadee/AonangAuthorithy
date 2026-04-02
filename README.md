# Electricity Service Request MVP

MVP ระบบรับคำร้องผู้ใช้ไฟฟ้าแบบเรียบง่าย โดยรอบนี้รองรับ 2 พื้นที่ + 2 ผู้รับผิดชอบที่เลือกได้อิสระ (ไม่ผูกตายตัว)

## สิ่งที่ทำได้
- สร้างคำร้องใหม่ (`/requests/new`)
- เลือกพื้นที่และผู้รับผิดชอบจาก dropdown
- บันทึกคำร้องลงฐานข้อมูล SQLite
- Dashboard ดูรายการคำร้องทั้งหมด (`/dashboard`)
- หน้ารายละเอียดคำร้อง (`/requests/:id`) พร้อมข้อมูลสำคัญ
- เปลี่ยนสถานะคำร้องเป็น `NEW`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
- เปลี่ยนผู้รับผิดชอบจากหน้า detail
- Dashboard แสดงข้อมูลล่าสุดจาก `updated_at` และ filter ตาม status

## Tech Stack
- Python 3 (standard library)
- `http.server` สำหรับเว็บ
- SQLite (`sqlite3`)

## Run
```bash
python app.py
```

เปิดใช้งานที่ `http://localhost:3000`

## Database (auto init + seed)
เมื่อรันระบบ จะสร้างตารางและ seed data อัตโนมัติ:
- `areas`
- `assignees`
- `service_requests`

Seed data:
- Areas: `AREA_1 | พื้นที่ 1`, `AREA_2 | พื้นที่ 2`
- Assignees: `STAFF_A | นาย A`, `STAFF_B | นาย B`
