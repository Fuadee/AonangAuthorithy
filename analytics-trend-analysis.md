# Analytics Trend Analysis (/analytics: แนวโน้มปริมาณงาน)

วันที่วิเคราะห์: 2026-04-05 (UTC)

## 1) Source of truth ของ section trend

Data flow ปัจจุบัน:
1. Route `/analytics` ดึงข้อมูลจากตาราง `service_requests` โดยตรงผ่าน Supabase (select fields จำนวนมาก รวม `created_at`, `updated_at`, `status`) แล้วส่งเข้า `<ExecutiveDashboard requests={...} />`.
2. ใน `ExecutiveDashboard` จะคำนวณช่วงเวลา (`resolveDateRange`) และกรองข้อมูลด้วย `filterRequestsByRange` ก่อน (กรองด้วย `created_at` เท่านั้น).
3. จากนั้นจึงคำนวณกราฟแนวโน้มด้วย `computeTrend(scopedRequests, range, bucket)`.

ดังนั้น **source of truth ของการนับ trend จริง** คือฟังก์ชัน `computeTrend` ในไฟล์:
- `lib/analytics/executive-dashboard.ts`

## 2) นิยาม “คำร้องเข้า” (incoming)

ในโค้ดปัจจุบัน งานจะถูกนับเป็น incoming เมื่อผ่านทุกเงื่อนไขต่อไปนี้:

1. อยู่ใน `scopedRequests` ก่อน ซึ่งหมายถึง `created_at` อยู่ในช่วงเวลาที่เลือก (`range.from` ถึง `range.to`) จาก `filterRequestsByRange`.
2. ตอนนับรายวัน (`bucket=DAY`): ใช้ `created_at` ของงานแปลงเป็นคีย์วันที่แบบ `YYYY-MM-DD` (UTC ผ่าน `toISOString().slice(0,10)`) แล้วเทียบกับคีย์ของวันนั้น.
3. ไม่มีเงื่อนไขกรอง status เพิ่มเติมสำหรับ incoming (ทุก status นับได้ ถ้า created_at อยู่ช่วง).
4. ไม่มีการกรอง queue/group/type เฉพาะใน trend.

## 3) นิยาม “งานปิด” (completed)

ในโค้ดปัจจุบัน งานจะถูกนับเป็น completed เฉพาะกรณี:

1. `status` ต้องเป็น `COMPLETED` หรือ `COORDINATED_WITH_CONSTRUCTION` เท่านั้น (`isCompleted`).
2. วันปิดที่ใช้ในการนับ trend คือ `updated_at` (ผ่าน `getCompletedAt`).
3. อย่างไรก็ดี งานทั้งหมดที่นำมาเข้า `computeTrend` ถูกกรองมาก่อนด้วย `created_at` จาก `filterRequestsByRange`.

ผลเชิงพฤติกรรมที่สำคัญ:
- ถึงงานจะปิดวันนี้ แต่ถ้าสร้างนอกช่วงเวลาที่เลือก จะถูกตัดออกตั้งแต่ `filterRequestsByRange` และไม่มีสิทธิ์ถูกนับเป็น completed ในกราฟนี้.
- ถ้างานมี status ปิดตามนิยาม แต่ `updated_at` parse ไม่ได้ จะไม่ถูกนับ completed (แม้โอกาสน้อย).

## 4) เงื่อนไขที่ทำให้งาน “ไม่ถูกนับ”

งานจะไม่ขึ้นใน trend ได้จากหลายจุด:

1. `created_at` อยู่นอกช่วงเวลา filter (สำคัญที่สุด เพราะตัดออกทั้ง incoming และ completed).
2. `created_at` เป็นค่าว่าง/parse ไม่ได้ (`filterRequestsByRange` คืน false).
3. สำหรับ completed: status ไม่ใช่ `COMPLETED` หรือ `COORDINATED_WITH_CONSTRUCTION`.
4. สำหรับ completed: `updated_at` เป็นค่าว่าง/parse ไม่ได้.
5. ประเด็น timezone bucket รายวัน: ใช้ `toISOString` (UTC) ในการสร้างคีย์วัน จึงมีโอกาสงานช่วงหลังเที่ยงคืนเวลาไทยไปตก bucket คนละวันจากที่ผู้ใช้คาด.

## 5) ช่วงเวลา default และผลกระทบ

- หน้า analytics default เป็น `30D`.
- `30D` คำนวณจาก `now - 29 วัน` ถึง `สิ้นวันของ now` (ตาม timezone ของ runtime ที่รัน JS).
- เมื่อ filter แรกใช้ `created_at` เท่านั้น จึงมีโอกาส “ข้อมูลมีอยู่จริงแต่ถูกตัดเพราะสร้างก่อนช่วง” แม้งานเพิ่งถูกปิดในช่วง.

## 6) การ aggregate และการ render

Aggregate:
- `7D`, `30D`, `THIS_MONTH` => รายวัน
- `90D` => รายสัปดาห์
- รายวันมีการ pre-build bucket ครบทุกวันในช่วง (แม้ค่าวันนั้นเป็น 0 ก็ยังมีแท่งเล็กแสดง)

Render:
- section trend render จริงแล้ว (ไม่ใช่ placeholder)
- data shape ตรงกัน: `TrendPoint { label, incoming, completed }` ถูกส่งเข้ากราฟทั้งสองฝั่ง
- หาก trend ว่างจริง ๆ จะแสดงข้อความ “ไม่มีข้อมูลในช่วงเวลานี้”

## 7) ตรวจเคส “งานล่าสุดของบอส”

ใน environment นี้ไม่สามารถดึงข้อมูล production/current dataset ได้ เพราะไม่มีค่า env สำหรับ Supabase (`NEXT_PUBLIC_SUPABASE_URL`, key) จึงยังยืนยันเลขคำร้องล่าสุดของ “บอส” ไม่ได้จากข้อมูลจริง.

สิ่งที่ทำได้ตอนนี้คือสรุปเงื่อนไขตัดสิน:
- ถ้างานของบอสเพิ่งสร้าง และ `created_at` อยู่ในช่วงที่เลือก => ต้องถูกนับ incoming แน่นอน (ไม่สน status)
- จะถูกนับ completed ก็ต่อเมื่อ status ปัจจุบันเป็น `COMPLETED` หรือ `COORDINATED_WITH_CONSTRUCTION` และ `updated_at` อยู่ใน bucket วันที่กำลังนับ
- ถ้าสร้างงานแล้ว “ไม่ขึ้นเลย” มีความเป็นไปได้สูงว่าติดที่ time range + timezone bucket หรือยังไม่ได้ refresh/revalidate path `/analytics` หลังสร้างงาน

## 8) Root cause ที่น่าจะเป็น (จากโค้ดปัจจุบัน)

Root cause เชิงตรรกะที่เด่นที่สุด:
1. **Completed series ผูกกับชุดข้อมูลที่ถูกกรองด้วย `created_at` ก่อน** (ไม่ใช่กรองด้วยวันปิด)
2. **Daily bucket ใช้ UTC date key (`toISOString`)** ซึ่งอาจคลาดกับมุมมองวันตาม Asia/Bangkok
3. **`createRequestAction` revalidate แค่ `/dashboard` และ `/surveyor` ไม่ได้ revalidate `/analytics`** ทำให้หน้า analytics อาจไม่เห็นข้อมูลใหม่ทันทีในบาง flow/cache

## 9) ข้อเสนอแนวแก้ (ยังไม่ patch)

ควรแก้ตามลำดับความเสี่ยง:
1. Query/transform:
   - แยกชุดข้อมูลนับ incoming (by created_at) และ completed (by completed timestamp ที่ชัดเจน) แทนการใช้ `scopedRequests` ชุดเดียว
2. Time filter:
   - ให้ completed series filter ด้วยวันปิดจริง (เช่น `updated_at` หรือเพิ่ม `completed_at` dedicated field)
3. Timezone:
   - ตกลง canonical timezone สำหรับ analytics (แนะนำ Asia/Bangkok สำหรับรายงานธุรกิจ) แล้ว normalize bucket key ให้สอดคล้อง
4. Cache/UI freshness:
   - เพิ่ม `revalidatePath('/analytics')` หลังสร้าง/อัปเดตงานที่กระทบ dashboard analytics

