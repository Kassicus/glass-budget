// Re-export Prisma types
export type {
  User,
  Account,
  Transaction,
  Bill,
  SavingsGoal,
  LoanDetails,
  Budget,
  AuditLog,
  AccountType,
  TransactionStatus,
  TransactionType,
  AuditAction,
} from '@prisma/client';

// Custom types for forms and API responses
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
}

export interface CreateAccountData {
  name: string;
  type: string;
  balance?: number;
  creditLimit?: number;
  institutionName?: string;
}

export interface CreateTransactionData {
  description: string;
  amount: number;
  category: string;
  type: string;
  accountId: string;
  date?: Date;
}

export interface CreateBillData {
  name: string;
  amount: number;
  category: string;
  dayOfMonth: number;
  accountId: string;
}

export interface CreateSavingsGoalData {
  name: string;
  targetAmount: number;
  targetDate?: Date;
}

// Dashboard statistics
export interface DashboardStats {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
}
