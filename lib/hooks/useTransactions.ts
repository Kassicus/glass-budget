import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Transaction } from '@prisma/client';
import {
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilters,
} from '@/lib/validations/transaction';

type TransactionWithAccount = Transaction & {
  account: {
    id: string;
    name: string;
    type: string;
  };
};

interface TransactionsResponse {
  transactions: TransactionWithAccount[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// Fetch transactions with filtering
export function useTransactions(filters?: Partial<TransactionFilters>) {
  const queryParams = new URLSearchParams();

  if (filters?.accountId) queryParams.set('accountId', filters.accountId);
  if (filters?.category) queryParams.set('category', filters.category);
  if (filters?.type) queryParams.set('type', filters.type);
  if (filters?.status) queryParams.set('status', filters.status);
  if (filters?.startDate) queryParams.set('startDate', filters.startDate.toISOString());
  if (filters?.endDate) queryParams.set('endDate', filters.endDate.toISOString());
  if (filters?.search) queryParams.set('search', filters.search);
  if (filters?.page) queryParams.set('page', filters.page.toString());
  if (filters?.limit) queryParams.set('limit', filters.limit.toString());

  return useQuery<TransactionsResponse>({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const response = await fetch(`/api/transactions?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return response.json();
    },
  });
}

// Fetch single transaction
export function useTransaction(id: string | undefined) {
  return useQuery<TransactionWithAccount>({
    queryKey: ['transactions', id],
    queryFn: async () => {
      const response = await fetch(`/api/transactions/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transaction');
      }
      return response.json();
    },
    enabled: !!id,
  });
}

// Fetch transaction categories
export function useTransactionCategories() {
  return useQuery<string[]>({
    queryKey: ['transaction-categories'],
    queryFn: async () => {
      const response = await fetch('/api/transactions/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      return response.json();
    },
  });
}

// Create transaction
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTransactionInput) => {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create transaction');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all transaction queries regardless of filters
      queryClient.invalidateQueries({ queryKey: ['transactions'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-categories'] });
    },
  });
}

// Update transaction
export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTransactionInput }) => {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update transaction');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['transactions', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-categories'] });
    },
  });
}

// Delete transaction
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete transaction');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
