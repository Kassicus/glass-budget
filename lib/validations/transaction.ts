import { z } from 'zod';
import { TransactionType, TransactionStatus } from '@prisma/client';

export const createTransactionSchema = z.object({
  description: z.string().min(1, 'Description is required').max(200),
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Category is required').max(50),
  type: z.nativeEnum(TransactionType, {
    errorMap: () => ({ message: 'Invalid transaction type' }),
  }),
  status: z.nativeEnum(TransactionStatus).optional().default(TransactionStatus.PENDING),
  date: z.coerce.date().optional(),
  accountId: z.string().min(1, 'Account is required'),
});

export const updateTransactionSchema = createTransactionSchema.partial();

// Query parameters for filtering transactions
export const transactionFiltersSchema = z.object({
  accountId: z.string().optional(),
  category: z.string().optional(),
  type: z.nativeEnum(TransactionType).optional(),
  status: z.nativeEnum(TransactionStatus).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;
