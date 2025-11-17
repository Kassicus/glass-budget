import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bill, Account } from '@prisma/client';
import { CreateBillInput, UpdateBillInput, PayBillInput } from '@/lib/validations/bill';

type BillWithAccount = Bill & {
  account: {
    id: string;
    name: string;
    type: string;
  };
};

// Fetch all bills
export function useBills(isActive?: boolean) {
  const queryParams = new URLSearchParams();
  if (isActive !== undefined) {
    queryParams.set('isActive', String(isActive));
  }

  return useQuery<BillWithAccount[]>({
    queryKey: ['bills', isActive],
    queryFn: async () => {
      const url = `/api/bills${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch bills');
      }
      return response.json();
    },
  });
}

// Fetch single bill
export function useBill(id: string | undefined) {
  return useQuery<BillWithAccount>({
    queryKey: ['bills', id],
    queryFn: async () => {
      const response = await fetch(`/api/bills/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bill');
      }
      return response.json();
    },
    enabled: !!id,
  });
}

// Create bill
export function useCreateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBillInput) => {
      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create bill');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

// Update bill
export function useUpdateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBillInput }) => {
      const response = await fetch(`/api/bills/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update bill');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bills'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['bills', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

// Delete bill
export function useDeleteBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/bills/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete bill');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

// Pay bill
export function usePayBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data?: PayBillInput }) => {
      const response = await fetch(`/api/bills/${id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to pay bill');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'], refetchType: 'all' });
    },
  });
}

// Unpay bill (mark as unpaid)
export function useUnpayBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/bills/${id}/pay`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark bill as unpaid');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
