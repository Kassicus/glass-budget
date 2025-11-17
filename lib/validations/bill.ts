import { z } from 'zod';

export const createBillSchema = z.object({
  name: z.string().min(1, 'Bill name is required').max(100),
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Category is required').max(50),
  dayOfMonth: z.number().int().min(1, 'Day must be between 1 and 31').max(31, 'Day must be between 1 and 31'),
  isActive: z.boolean().optional().default(true),
  accountId: z.string().min(1, 'Account is required'),
  isLoanPayment: z.boolean().optional().default(false),
  loanAccountId: z.string().optional(),
});

export const updateBillSchema = createBillSchema.partial();

export const payBillSchema = z.object({
  paidDate: z.coerce.date().optional(),
});

export type CreateBillInput = z.infer<typeof createBillSchema>;
export type UpdateBillInput = z.infer<typeof updateBillSchema>;
export type PayBillInput = z.infer<typeof payBillSchema>;
