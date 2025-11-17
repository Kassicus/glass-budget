import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Account, LoanDetails } from '@prisma/client';
import { CreateAccountInput, UpdateAccountInput, LoanDetailsInput } from '@/lib/validations/account';

type AccountWithDetails = Account & {
  loanDetails?: LoanDetails | null;
  _count?: {
    transactions: number;
    bills: number;
  };
};

// Fetch all accounts
export function useAccounts() {
  return useQuery<AccountWithDetails[]>({
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await fetch('/api/accounts');
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      return response.json();
    },
  });
}

// Fetch single account
export function useAccount(id: string | undefined) {
  return useQuery<AccountWithDetails>({
    queryKey: ['accounts', id],
    queryFn: async () => {
      const response = await fetch(`/api/accounts/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch account');
      }
      return response.json();
    },
    enabled: !!id,
  });
}

// Create account
export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAccountInput) => {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create account');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

// Update account
export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAccountInput }) => {
      const response = await fetch(`/api/accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update account');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts', variables.id] });
    },
  });
}

// Delete account
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/accounts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete account');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

// Create loan details
export function useCreateLoanDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, data }: { accountId: string; data: LoanDetailsInput }) => {
      const response = await fetch(`/api/accounts/${accountId}/loan-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create loan details');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts', variables.accountId] });
    },
  });
}

// Update loan details
export function useUpdateLoanDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, data }: { accountId: string; data: Partial<LoanDetailsInput> }) => {
      const response = await fetch(`/api/accounts/${accountId}/loan-details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update loan details');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts', variables.accountId] });
    },
  });
}
