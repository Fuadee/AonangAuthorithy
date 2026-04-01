insert into roles(code, name_th) values
('RECEPTIONIST', 'ผู้รับคำร้อง'),
('SURVEYOR', 'ผู้สำรวจ'),
('OPERATIONS', 'เจ้าหน้าที่ดำเนินการ'),
('SUPERVISOR', 'หัวหน้างาน'),
('MANAGER', 'ผู้จัดการ/ผู้อนุมัติ'),
('INSTALL_PLANNER', 'ผู้จัดคิวติดตั้ง')
on conflict (code) do nothing;

insert into sla_policies(policy_code, from_status, max_days) values
('WAIT_ASSIGNMENT_2D', 'WAITING_SURVEY_ASSIGNMENT', 2),
('WAIT_SURVEY_REVIEW_2D', 'WAITING_SURVEYOR_DOCUMENT_REVIEW', 2),
('SURVEY_DONE_TO_NEXT_1D', 'SURVEY_COMPLETED', 1),
('PAID_TO_QUEUE_1D', 'METER_WAITING_INSTALL_QUEUE', 1)
on conflict (policy_code) do nothing;
