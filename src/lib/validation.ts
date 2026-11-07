import { z } from "zod";

export const checkoutSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(20),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
  deliveryAddress: z.string().trim().min(5).max(500),
  deliveryTown: z.string().trim().min(2).max(100),
  deliveryInstructions: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(["MPESA", "CASH", "CHEQUE", "CREDIT"]),
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(30),
});

export const orderStatusSchema = z.object({
  orderStatus: z.enum([
    "NEW",
    "CONFIRMED",
    "BEING_PACKED",
    "READY_FOR_DISPATCH",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
  ]),
  cancellationReason: z.string().trim().max(500).optional(),
}).superRefine((value, context) => {
  if (value.orderStatus === "CANCELLED" && !value.cancellationReason) {
    context.addIssue({
      code: "custom",
      path: ["cancellationReason"],
      message: "Enter a reason for cancelling the order.",
    });
  }
});

export const paymentEntrySchema = z.object({
  amount: z.number().positive().max(100_000_000),
  paymentMethod: z.enum(["MPESA", "CASH", "CHEQUE"]),
  paymentReference: z.string().trim().max(120).optional(),
  chequeNumber: z.string().trim().max(100).optional(),
  bankName: z.string().trim().max(100).optional(),
  chequeDate: z.string().date().optional(),
});

export const manualOrderSchema = checkoutSchema.extend({
  orderSource: z.enum(["WHATSAPP", "PHONE", "SOCIAL_MEDIA", "IN_PERSON", "OTHER"]),
  paymentMethod: z.enum(["MPESA", "CASH", "CHEQUE"]),
});
