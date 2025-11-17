import { z } from 'zod';
import { AccountType } from '@prisma/client';

// Base account schema
export const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  type: z.nativeEnum(AccountType, {
    errorMap: () => ({ message: 'Invalid account type' }),
  }),
  balance: z.number().optional().default(0),
  creditLimit: z.number().optional(),
  currentBalance: z.number().optional(),
  institutionName: z.string().max(100).optional(),
  accountLast4: z.string().length(4).optional(),
});

export const updateAccountSchema = createAccountSchema.partial();

// Loan details schema
export const loanDetailsSchema = z.object({
  originalAmount: z.number().positive('Original amount must be positive'),
  currentPrincipal: z.number().nonnegative('Current principal cannot be negative'),
  interestRate: z.number().nonnegative('Interest rate cannot be negative').max(100),
  loanTermMonths: z.number().int().positive('Loan term must be positive'),
  monthlyPayment: z.number().positive('Monthly payment must be positive'),
  loanStartDate: z.coerce.date(),
  nextPaymentDate: z.coerce.date(),
  lenderName: z.string().max(100).optional(),
  loanNumber: z.string().max(50).optional(),
  propertyAddress: z.string().max(200).optional(),
  vehicleInfo: z.string().max(200).optional(),
});

export const updateLoanDetailsSchema = loanDetailsSchema.partial();

// Combined schema for creating account with loan details
export const createAccountWithLoanSchema = z.object({
  account: createAccountSchema,
  loanDetails: loanDetailsSchema.optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type LoanDetailsInput = z.infer<typeof loanDetailsSchema>;
export type CreateAccountWithLoanInput = z.infer<typeof createAccountWithLoanSchema>;
