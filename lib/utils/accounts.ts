import { Account, AccountType, LoanDetails } from '@prisma/client';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: 'Checking',
  SAVINGS: 'Savings',
  CREDIT: 'Credit Card',
  INVESTMENT: 'Investment',
  AUTO_LOAN: 'Auto Loan',
  MORTGAGE: 'Mortgage',
  PERSONAL_LOAN: 'Personal Loan',
  STUDENT_LOAN: 'Student Loan',
};

export const LOAN_ACCOUNT_TYPES: AccountType[] = [
  AccountType.AUTO_LOAN,
  AccountType.MORTGAGE,
  AccountType.PERSONAL_LOAN,
  AccountType.STUDENT_LOAN,
];

export const ASSET_ACCOUNT_TYPES: AccountType[] = [
  AccountType.CHECKING,
  AccountType.SAVINGS,
  AccountType.INVESTMENT,
];

export const LIABILITY_ACCOUNT_TYPES: AccountType[] = [
  AccountType.CREDIT,
  ...LOAN_ACCOUNT_TYPES,
];

export function isLoanAccount(type: AccountType): boolean {
  return LOAN_ACCOUNT_TYPES.includes(type);
}

export function isAssetAccount(type: AccountType): boolean {
  return ASSET_ACCOUNT_TYPES.includes(type);
}

export function isLiabilityAccount(type: AccountType): boolean {
  return LIABILITY_ACCOUNT_TYPES.includes(type);
}

export function getAccountDisplayBalance(
  account: Account & { loanDetails?: LoanDetails | null }
): number {
  if (account.type === AccountType.CREDIT) {
    return -(account.currentBalance || 0);
  } else if (isLoanAccount(account.type) && account.loanDetails) {
    return -account.loanDetails.currentPrincipal;
  } else {
    return account.balance;
  }
}

export function calculateNetWorth(
  accounts: (Account & { loanDetails?: LoanDetails | null })[]
): {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
} {
  let totalAssets = 0;
  let totalLiabilities = 0;

  accounts.forEach((account) => {
    const balance = getAccountDisplayBalance(account);
    if (balance > 0) {
      totalAssets += balance;
    } else {
      totalLiabilities += Math.abs(balance);
    }
  });

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
  };
}

export function calculateCreditUtilization(account: Account): number {
  if (account.type !== AccountType.CREDIT || !account.creditLimit) {
    return 0;
  }
  const utilization = ((account.currentBalance || 0) / account.creditLimit) * 100;
  return Math.min(Math.max(utilization, 0), 100);
}

export function calculateLoanProgress(loanDetails: LoanDetails): number {
  if (!loanDetails.originalAmount) return 0;
  const paidAmount = loanDetails.originalAmount - loanDetails.currentPrincipal;
  return (paidAmount / loanDetails.originalAmount) * 100;
}

export function estimateRemainingPayments(loanDetails: LoanDetails): number {
  if (loanDetails.monthlyPayment <= 0) return 0;
  return Math.ceil(loanDetails.currentPrincipal / loanDetails.monthlyPayment);
}

export function estimatePayoffDate(loanDetails: LoanDetails): Date {
  const remainingPayments = estimateRemainingPayments(loanDetails);
  const payoffDate = new Date(loanDetails.nextPaymentDate);
  payoffDate.setMonth(payoffDate.getMonth() + remainingPayments);
  return payoffDate;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
