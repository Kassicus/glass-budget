import { z } from 'zod';
import { TransactionType, TransactionStatus } from '@prisma/client';

const baseTransactionSchema = z.object({
  description: z.string().min(1, 'Description is required').max(200),
  amount: z.number().positive('Amount must be positive'),
  category: z.string().max(50).optional(),
  type: z.nativeEnum(TransactionType, {
    errorMap: () => ({ message: 'Invalid transaction type' }),
  }),
  status: z.nativeEnum(TransactionStatus).optional(),
  date: z.coerce.date().optional(),
  accountId: z.string().min(1, 'Account is required'),
  toAccountId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const createTransactionSchema = baseTransactionSchema.refine(
  (data) => {
    // If type is TRANSFER, toAccountId is required
    if (data.type === TransactionType.TRANSFER) {
      return !!data.toAccountId && data.toAccountId !== data.accountId;
    }
    // If not a transfer, category is required
    if (data.type !== TransactionType.TRANSFER && !data.category) {
      return false;
    }
    return true;
  },
  {
    message: 'Destination account is required for transfers and must be different from source account',
    path: ['toAccountId'],
  }
);

export const updateTransactionSchema = baseTransactionSchema.partial();

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
