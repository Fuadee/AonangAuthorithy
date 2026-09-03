# Workflow Audit (as-is code) — 2026-04-08

เอกสารนี้สรุปจากโค้ดที่ execute จริง ณ ปัจจุบัน (server actions + action config + queue mapping + schema)

## A. Executive summary

### งานขอมิเตอร์ (METER)
- เริ่มที่ `WAIT_DOCUMENT_REVIEW` ตั้งแต่ตอนสร้างคำร้อง
- ผ่านเอกสาร -> นัดสำรวจ/สำรวจ -> ถ้าผ่านไป `WAIT_BILLING`
- ถ้าไม่ผ่าน จะเข้าลูป `WAIT_CUSTOMER_FIX` -> (`WAIT_FIX_REVIEW` หรือ `READY_FOR_RESURVEY`) -> กลับเข้า `IN_SURVEY` หรือปิดด้วยอนุมัติจากรูป
- หลังออกบิลเป็น post-billing แบบเงื่อนไขขนาน (เซ็น/ชำระ ทำสลับได้) โดย status คงอยู่ที่ `WAIT_ACTION_CONFIRMATION` จนทั้งสอง flag ครบ แล้วไป `WAIT_MANAGER_REVIEW` -> `COMPLETED`

### งานขยายเขต (EXPANSION)
- ช่วงต้นใช้ flow สำรวจร่วมกับงานขอมิเตอร์ (`WAIT_DOCUMENT_REVIEW` -> `READY_FOR_SURVEY` -> `IN_SURVEY`)
- หลังสำรวจเสร็จไม่เข้าคิว billing แบบมิเตอร์ แต่ไป `WAIT_LAYOUT_DRAWING` -> `WAITING_TO_SEND_TO_KRABI`
- จากนั้นเป็น flow ฝั่งเอกสาร/กระบี่: `SENT_TO_KRABI` -> (`KRABI_IN_PROGRESS` หรือ `KRABI_NEEDS_DOCUMENT_FIX`)
- ถ้าโดนตีกลับจะวนลูปกลับ `WAITING_TO_SEND_TO_KRABI`
- ปลายทางคือ `KRABI_ESTIMATION_COMPLETED` -> `BILL_ISSUED` -> `COORDINATED_WITH_CONSTRUCTION`

### จุดต่างหลักระหว่าง 2 flow
- METER มี post-survey fix loop + billing loop + manager approval
- EXPANSION มี layout + dispatch + krabi loop และไม่มี manager/billing queue ของมิเตอร์
- Guard ใน server action บังคับไม่ให้ METER ไป status ฝั่ง Krabi และไม่ให้ EXPANSION ไป `WAIT_BILLING`

## B. Status inventory

### งานขอมิเตอร์ (METER)
- `WAIT_DOCUMENT_REVIEW` — รอตรวจเอกสาร — Queue SURVEY — ต้นทาง
- `WAIT_DOCUMENT_FROM_CUSTOMER` — รอผู้ใช้ไฟนำเอกสารมาให้ — Queue SURVEY — วนกลับแก้เอกสาร
- `READY_FOR_SURVEY` — พร้อมรับงานสำรวจ — Queue SURVEY — กลางทาง
- `IN_SURVEY` — กำลังสำรวจหน้างาน — Queue SURVEY — กลางทาง
- `SURVEY_COMPLETED` — สำรวจแล้ว — Queue SURVEY — เคสรับเอกสารหน้างาน (รอยืนยันก่อน billing)
- `WAIT_CUSTOMER_FIX` — รอผู้ใช้ไฟแก้ไข — Queue SURVEY — วนกลับแก้ไข
- `WAIT_FIX_REVIEW` — รอตรวจจากรูป/ข้อมูลที่ส่งมา — Queue SURVEY — วนกลับแก้ไข
- `READY_FOR_RESURVEY` — รอนัดตรวจซ้ำ — Queue SURVEY — วนกลับแก้ไข
- `WAIT_BILLING` — รอออกใบแจ้งหนี้ — Queue BILLING — กลางทาง
- `WAIT_ACTION_CONFIRMATION` — รอชำระเงิน (จริง ๆ คือรอเซ็น/ชำระให้ครบ) — Queue BILLING — กลางทาง
- `WAIT_MANAGER_REVIEW` — รอผู้จัดการตรวจ — Queue MANAGER — กลางทางท้าย
- `COMPLETED` — เสร็จสิ้น — Queue DONE — ปลายทาง

สถานะ legacy ที่อยู่ใน enum แต่ถูก normalize ใน logic ใหม่:
- `PENDING_SURVEY_REVIEW` -> เทียบเป็น `WAIT_DOCUMENT_REVIEW`
- `SURVEY_DOCS_INCOMPLETE` -> เทียบเป็น `WAIT_DOCUMENT_FROM_CUSTOMER`
- `SURVEY_ACCEPTED`, `SURVEY_RESCHEDULE_REQUESTED` -> เทียบเป็น `READY_FOR_SURVEY`

### งานขยายเขต (EXPANSION)
- Shared survey statuses: `WAIT_DOCUMENT_REVIEW`, `WAIT_DOCUMENT_FROM_CUSTOMER`, `READY_FOR_SURVEY`, `IN_SURVEY`
- `WAIT_LAYOUT_DRAWING` — รอวาดผัง — Queue DISPATCH — กลางทางเฉพาะขยายเขต
- `WAITING_TO_SEND_TO_KRABI` — รอจัดส่งเอกสาร — Queue DISPATCH — กลางทาง
- `SENT_TO_KRABI` — ส่งเอกสารไปกระบี่แล้ว — Queue DISPATCH — กลางทาง
- `WAIT_KRABI_DOCUMENT_CHECK` — รอกระบี่ตรวจรับเอกสาร — Queue DISPATCH — กลางทาง
- `KRABI_NEEDS_DOCUMENT_FIX` — กระบี่ตีกลับให้แก้ไขเอกสาร — Queue DISPATCH — วนกลับแก้เอกสาร
- `KRABI_IN_PROGRESS` — กระบี่กำลังประมาณการ — Queue KRABI — กลางทาง
- `KRABI_ESTIMATION_COMPLETED` — กระบี่ประมาณการเสร็จแล้ว — Queue KRABI — กลางทางท้าย
- `BILL_ISSUED` — ออกใบแจ้งหนี้แล้ว — Queue KRABI — กลางทางท้าย
- `COORDINATED_WITH_CONSTRUCTION` — แล้วเสร็จ/ผกส.รับเรื่อง — Queue DONE — ปลายทาง

## C. Transition map (execute จริง)

| ประเภทงาน | From status | Action/Trigger | To status | เงื่อนไขหลัก | ฟังก์ชัน |
|---|---|---|---|---|---|
| METER/EXPANSION | CREATE | createRequest | WAIT_DOCUMENT_REVIEW | ต้องผ่าน validation create form | `createRequestAction` |
| Shared | WAIT_DOCUMENT_REVIEW | DOC_COMPLETE | READY_FOR_SURVEY | decision=COMPLETE | `updateDocumentReviewDecisionAction` |
| Shared | WAIT_DOCUMENT_REVIEW | DOC_INCOMPLETE_COLLECT_ON_SITE | READY_FOR_SURVEY | note required | `updateDocumentReviewDecisionAction` |
| Shared | WAIT_DOCUMENT_REVIEW | DOC_INCOMPLETE_WAIT_CUSTOMER | WAIT_DOCUMENT_FROM_CUSTOMER | note required + clear schedule | `updateDocumentReviewDecisionAction` |
| Shared | WAIT_DOCUMENT_FROM_CUSTOMER | CONFIRM_DOCS_RECEIVED | READY_FOR_SURVEY | ต้องอยู่สถานะนี้เท่านั้น | `confirmDocumentsReceivedFromCustomerAction` |
| Shared | READY_FOR_SURVEY | SCHEDULE_SURVEY/EDIT_SURVEY_DATE | READY_FOR_SURVEY (หรือ WAIT_DOCUMENT_FROM_CUSTOMER -> READY_FOR_SURVEY) | date valid, ถ้าเลื่อนต้องมีเหตุผล | `updateSurveyScheduleAction` |
| Shared | READY_FOR_SURVEY/READY_FOR_RESURVEY | START_SURVEY | IN_SURVEY | ต้องมีวันนัด (กรณี READY_FOR_SURVEY) | `startSurveyAction` |
| METER | IN_SURVEY | SURVEY_PASS | WAIT_BILLING | ใช้ได้เฉพาะ METER | `markSurveyPassedAction` |
| METER | IN_SURVEY | SURVEY_FAIL | WAIT_CUSTOMER_FIX | ต้องมี customer_fix_note + mode | `markSurveyFailedAction` |
| METER | WAIT_CUSTOMER_FIX | REPORT_CUSTOMER_FIX | WAIT_FIX_REVIEW หรือ READY_FOR_RESURVEY | ขึ้นกับ `fix_verification_mode` | `reportCustomerFixAction` |
| METER | WAIT_CUSTOMER_FIX / WAIT_FIX_REVIEW | SCHEDULE_RESURVEY | READY_FOR_RESURVEY | เฉพาะ METER | `moveToResurveyAction` |
| METER | WAIT_FIX_REVIEW | PHOTO_APPROVE | WAIT_BILLING | ต้อง mode = PHOTO_OR_RESURVEY | `approveFixFromPhotoAction` |
| METER | WAIT_FIX_REVIEW | PHOTO_REJECT_TO_RESURVEY | READY_FOR_RESURVEY | เฉพาะสถานะนี้ | `rejectFixPhotoAndRequireResurveyAction` |
| METER | IN_SURVEY | COMPLETE_SURVEY (fallback) | SURVEY_COMPLETED หรือ WAIT_BILLING | ถ้า collect_docs_on_site=true -> SURVEY_COMPLETED | `completeSurveyAction` |
| METER | SURVEY_COMPLETED | Confirm on-site docs complete | WAIT_BILLING | ต้อง collect_docs_on_site=true | `confirmOnSiteDocumentsCompleteAction` |
| METER | WAIT_BILLING | ISSUE_BILL | WAIT_ACTION_CONFIRMATION | เฉพาะ METER | `issueBillingAction` |
| METER | WAIT_ACTION_CONFIRMATION | SURVEYOR_SIGN | WAIT_ACTION_CONFIRMATION หรือ WAIT_MANAGER_REVIEW | resolve จาก flags signed+paid | `confirmBillingSurveyorSignAction` |
| METER | WAIT_ACTION_CONFIRMATION | CONFIRM_PAYMENT | WAIT_ACTION_CONFIRMATION หรือ WAIT_MANAGER_REVIEW | resolve จาก flags signed+paid | `confirmPaymentReceivedAction` |
| METER | WAIT_MANAGER_REVIEW | MANAGER_APPROVE | COMPLETED | signed+paid ต้องครบ | `approveManagerReviewAction` |
| EXPANSION | IN_SURVEY | COMPLETE_SURVEY | WAIT_LAYOUT_DRAWING | branch ตาม request_type | `completeSurveyAction` |
| EXPANSION | SURVEY_COMPLETED / WAIT_LAYOUT_DRAWING | LAYOUT_DRAWING_DONE | WAITING_TO_SEND_TO_KRABI | เฉพาะ EXPANSION | `completeLayoutDrawingAction` |
| EXPANSION | WAITING_TO_SEND_TO_KRABI | DISPATCHED_TO_KRABI | SENT_TO_KRABI | ต้องมี dispatcher_name | `markSentToKrabiAction` |
| EXPANSION | SENT_TO_KRABI / WAIT_KRABI_DOCUMENT_CHECK | KRABI_ACCEPT_AND_START | KRABI_IN_PROGRESS | เฉพาะ EXPANSION | `markKrabiInProgressAction` |
| EXPANSION | SENT_TO_KRABI / WAIT_KRABI_DOCUMENT_CHECK | KRABI_RETURN_FOR_FIX | KRABI_NEEDS_DOCUMENT_FIX | ต้องมีเหตุผลตีกลับ | `markKrabiNeedsDocumentFixAction` |
| EXPANSION | KRABI_NEEDS_DOCUMENT_FIX | KRABI_FIX_COMPLETED | WAITING_TO_SEND_TO_KRABI | loop ส่งใหม่ | `markKrabiDocumentFixCompletedAction` |
| EXPANSION | KRABI_IN_PROGRESS | KRABI_ESTIMATION_COMPLETED | KRABI_ESTIMATION_COMPLETED | เฉพาะ EXPANSION | `markKrabiEstimationCompletedAction` |
| EXPANSION | KRABI_ESTIMATION_COMPLETED | KRABI_BILL_ISSUED | BILL_ISSUED | เฉพาะ EXPANSION | `markExpansionBillIssuedAction` |
| EXPANSION | BILL_ISSUED | COORDINATED_WITH_CONSTRUCTION | COORDINATED_WITH_CONSTRUCTION | เฉพาะ EXPANSION | `markCoordinatedWithConstructionAction` |

## D. Current workflow as text diagram

### งานขอมิเตอร์
START
-> WAIT_DOCUMENT_REVIEW
-> (เอกสารครบ) READY_FOR_SURVEY
-> (กำหนดวัน/แก้วัน) READY_FOR_SURVEY
-> START_SURVEY -> IN_SURVEY
-> (ผ่าน) WAIT_BILLING
-> ISSUE_BILL -> WAIT_ACTION_CONFIRMATION
-> (เซ็น/ชำระ สลับได้) WAIT_ACTION_CONFIRMATION
-> (เมื่อ signed+paid ครบ) WAIT_MANAGER_REVIEW
-> MANAGER_APPROVE -> COMPLETED
-> END

ลูปเอกสาร:
WAIT_DOCUMENT_REVIEW
-> เอกสารไม่ครบ (รอลูกค้านำมา)
-> WAIT_DOCUMENT_FROM_CUSTOMER
-> CONFIRM_DOCS_RECEIVED
-> READY_FOR_SURVEY

ลูปแก้ไขหลังสำรวจ:
IN_SURVEY
-> SURVEY_FAIL
-> WAIT_CUSTOMER_FIX
-> REPORT_CUSTOMER_FIX
-> WAIT_FIX_REVIEW
-> (PHOTO_APPROVE) WAIT_BILLING
หรือ
-> (PHOTO_REJECT_TO_RESURVEY / SCHEDULE_RESURVEY)
-> READY_FOR_RESURVEY
-> START_SURVEY
-> IN_SURVEY

ลูปเคสรับเอกสารหน้างาน:
IN_SURVEY
-> COMPLETE_SURVEY
-> SURVEY_COMPLETED
-> CONFIRM_ON_SITE_DOCUMENTS_COMPLETE
-> WAIT_BILLING

### งานขยายเขต
START
-> WAIT_DOCUMENT_REVIEW
-> READY_FOR_SURVEY
-> START_SURVEY
-> IN_SURVEY
-> COMPLETE_SURVEY
-> WAIT_LAYOUT_DRAWING
-> LAYOUT_DRAWING_DONE
-> WAITING_TO_SEND_TO_KRABI
-> DISPATCHED_TO_KRABI
-> SENT_TO_KRABI
-> KRABI_ACCEPT_AND_START
-> KRABI_IN_PROGRESS
-> KRABI_ESTIMATION_COMPLETED
-> BILL_ISSUED
-> COORDINATED_WITH_CONSTRUCTION
-> END

ลูปตีกลับเอกสารจากกระบี่:
SENT_TO_KRABI / WAIT_KRABI_DOCUMENT_CHECK
-> KRABI_RETURN_FOR_FIX
-> KRABI_NEEDS_DOCUMENT_FIX
-> KRABI_FIX_COMPLETED
-> WAITING_TO_SEND_TO_KRABI
-> ส่งใหม่

## E. UI/Screen mapping

- `/dashboard` = ภาพรวมทุก queue (filter ด้วย queue group) และ action ผ่าน `RequestTable` + `WorkflowActionButtons`
- `/surveyor` = queue SURVEY ทั้งหมด (ทั้ง METER/EXPANSION ช่วงต้น) + action หลักตาม status
- `/survey/map` = แสดงเฉพาะ `IN_SURVEY` (active field jobs)
- `/survey/planning` = แสดงงาน survey active statuses ที่มี scheduled date
- `/document` = queue DISPATCH (WAIT_LAYOUT_DRAWING / WAITING_TO_SEND_TO_KRABI / SENT_TO_KRABI / WAIT_KRABI_DOCUMENT_CHECK / KRABI_NEEDS_DOCUMENT_FIX)
- `/krabi` = queue KRABI (KRABI_IN_PROGRESS / KRABI_ESTIMATION_COMPLETED / BILL_ISSUED)
- `/billing` = queue BILLING (WAIT_BILLING / WAIT_ACTION_CONFIRMATION)
- `/manager` = queue MANAGER (WAIT_MANAGER_REVIEW)
- `/requests/[id]` = detail+timeline+summary เป็นหลัก (ไม่มีปุ่ม workflow หลักในหน้านี้)

## F. Findings / inconsistencies

1) **สถานะ legacy ยังอยู่ใน enum/label/queue แต่ flow ใหม่ normalize แล้ว**
- `PENDING_SURVEY_REVIEW`, `SURVEY_ACCEPTED`, `SURVEY_DOCS_INCOMPLETE`, `SURVEY_RESCHEDULE_REQUESTED` ยังมีใน enum และยังมี handler `updateSurveyorAction`
- แต่ UI คิวหลักใช้งานชุด action ใหม่ (`WAIT_DOCUMENT_REVIEW` เป็นต้น)

2) **มี Action key ใน config ที่ไม่มี executor ใน `WorkflowActionModal`**
- `ISSUE_BILL`, `SURVEYOR_SIGN`, `CONFIRM_PAYMENT` อยู่ใน `WorkflowActionKey` แต่รันจริงผ่าน `BillingWorkflowActionRenderer` แยก

3) **`RequestStatusForm` เปิดให้เลือกทุก status**
- แต่ guard ฝั่ง server บล็อกการข้ามขั้นบางส่วนเท่านั้น
- จึงเป็น “manual override path” ที่อาจทำให้เกิด transition ไม่ผ่านปุ่ม workflow ปกติ

4) **`markDocumentReadyAction` มีแต่ไม่เจอปุ่มเรียกใน flow ปัจจุบัน**
- Action นี้ตั้ง `planned_dispatch_date` แต่ไม่ได้ผูกตรงกับปุ่มหลักใน workflow modal

5) **`WAIT_KRABI_DOCUMENT_CHECK` มีใน transition guard และ action source แต่จาก flow ปัจจุบันไม่มี action ที่ set เข้าสถานะนี้โดยตรง**
- ปุ่ม `DISPATCHED_TO_KRABI` พาไป `SENT_TO_KRABI` และปุ่ม Krabi รับงาน/ตีกลับรองรับทั้ง `SENT_TO_KRABI` กับ `WAIT_KRABI_DOCUMENT_CHECK`

6) **Label “WAIT_ACTION_CONFIRMATION = รอชำระเงิน” ไม่สะท้อน logic จริงทั้งหมด**
- ในสถานะนี้ต้องรอทั้ง “เซ็นใบแจ้งหนี้” และ “ชำระเงิน” (ทำสลับกันได้)

7) **request detail page เป็น read-oriented**
- มี next-step summary และ timeline ชัดเจน แต่ไม่มี action buttons หลัก ทำให้ผู้ใช้ต้องกดจากคิวหน้าอื่น

## G. Diagram-ready version

### งานขอมิเตอร์ (status sequence ย่อ)
`WAIT_DOCUMENT_REVIEW`
-> `READY_FOR_SURVEY` | `WAIT_DOCUMENT_FROM_CUSTOMER`
-> `READY_FOR_SURVEY`
-> `IN_SURVEY`
-> (`WAIT_BILLING` | `WAIT_CUSTOMER_FIX` | `SURVEY_COMPLETED`)
-> (`WAIT_FIX_REVIEW` | `READY_FOR_RESURVEY`)
-> `IN_SURVEY` (loop)
-> `WAIT_BILLING`
-> `WAIT_ACTION_CONFIRMATION`
-> `WAIT_MANAGER_REVIEW`
-> `COMPLETED`

### งานขยายเขต (status sequence ย่อ)
`WAIT_DOCUMENT_REVIEW`
-> `READY_FOR_SURVEY` | `WAIT_DOCUMENT_FROM_CUSTOMER`
-> `READY_FOR_SURVEY`
-> `IN_SURVEY`
-> `WAIT_LAYOUT_DRAWING`
-> `WAITING_TO_SEND_TO_KRABI`
-> `SENT_TO_KRABI`
-> (`KRABI_IN_PROGRESS` | `KRABI_NEEDS_DOCUMENT_FIX`)
-> `WAITING_TO_SEND_TO_KRABI` (loop เมื่อ fix)
-> `KRABI_IN_PROGRESS`
-> `KRABI_ESTIMATION_COMPLETED`
-> `BILL_ISSUED`
-> `COORDINATED_WITH_CONSTRUCTION`

## H. Update 2026-04-08 (งานเพิ่มเป็นมิเตอร์ 3 เฟส)

- เพิ่ม request type ใหม่ `METER_TO_3PHASE` (label: งานเพิ่มเป็นมิเตอร์ 3 เฟส)
- Flow ใหม่ของงาน 3 เฟส:
  `WAIT_DOCUMENT_REVIEW` -> `WAIT_DOCUMENT_FROM_CUSTOMER`/`READY_FOR_SURVEY` -> `IN_SURVEY` -> ตัดสินใจความพร้อม 3 เฟส
  - รองรับ: `DESIGN_AND_ESTIMATE` -> `WAIT_BILLING` -> `WAIT_PAYMENT` -> `INSTALLATION` -> `INSPECTION` -> `COMPLETED`
  - ไม่รองรับ: ส่งต่องานเดิมไป flow ขยายเขตที่ `WAIT_LAYOUT_DRAWING` ทันที (ไม่สร้างคำร้องใหม่)
- เพิ่ม trace field ในคำร้องเดิม: `forwarded_to_expansion_at`, `forwarded_to_expansion_note`
- Timeline มีข้อความ: “ระบบไม่รองรับ 3 เฟส จึงส่งต่อเข้าสู่ขั้นตอนขยายเขต ที่สถานะ WAIT_LAYOUT_DRAWING”
> เอกสารนี้เป็น snapshot ของ workflow เดิมก่อน migration วันที่ 2026-09-03 และเก็บไว้เพื่อ audit เท่านั้น
> สถานะ/ขั้นตอนการเงินที่กล่าวถึงด้านล่างไม่ใช่ source of truth ปัจจุบัน กรุณาอ้างอิงโค้ดใน `lib/requests/workflow-transitions.ts`, `lib/requests/workflow-action-config.ts` และ migration ล่าสุด
