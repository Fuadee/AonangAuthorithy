import { z } from "zod";

const optionalText = z.preprocess((v) => (typeof v === "string" && v.length > 0 ? v : undefined), z.string().optional());

export const createRequestSchema = z.object({
  requestType: z.enum(["METER", "EXTENSION"]),
  areaCode: z.string().min(2),
  customerName: z.string().min(2),
  customerPhone: z.string().min(8),
  supplyAddress: z.string().min(8)
});

export const assignRequestSchema = z.object({
  requestId: z.string().uuid(),
  assigneeId: z.string().uuid(),
  note: optionalText
});

export const reviewDocumentSchema = z
  .object({
    requestId: z.string().uuid(),
    decision: z.enum(["READY", "INCOMPLETE", "NEED_INFO"]),
    missingItems: z.array(z.string()).default([]),
    note: optionalText
  })
  .superRefine((val, ctx) => {
    if (val.decision === "INCOMPLETE" && val.missingItems.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "ต้องระบุรายการเอกสารที่ขาด" });
    }
  });
