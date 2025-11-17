'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Alert,
  Autocomplete,
} from '@mui/material';
import { TransactionType, TransactionStatus } from '@prisma/client';
import { CreateTransactionInput } from '@/lib/validations/transaction';
import { useAccounts } from '@/lib/hooks/useAccounts';
import { useTransactionCategories } from '@/lib/hooks/useTransactions';

interface TransactionFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTransactionInput) => void;
  initialData?: Partial<CreateTransactionInput>;
  isLoading?: boolean;
  error?: string;
}

const TRANSACTION_TYPE_LABELS = {
  INCOME: 'Income',
  EXPENSE: 'Expense',
  TRANSFER: 'Transfer',
};

const TRANSACTION_STATUS_LABELS = {
  PENDING: 'Pending',
  CLEARED: 'Cleared',
  RECONCILED: 'Reconciled',
};

export function TransactionForm({
  open,
  onClose,
  onSubmit,
  initialData,
  isLoading,
  error,
}: TransactionFormProps) {
  const { data: accounts } = useAccounts();
  const { data: existingCategories = [] } = useTransactionCategories();

  const [formData, setFormData] = useState<CreateTransactionInput>({
    description: '',
    amount: 0,
    category: '',
    type: TransactionType.EXPENSE,
    status: TransactionStatus.PENDING,
    accountId: '',
    date: new Date(),
    toAccountId: undefined,
    notes: undefined,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        description: initialData?.description || '',
        amount: initialData?.amount ?? 0,
        category: initialData?.category || '',
        type: initialData?.type || TransactionType.EXPENSE,
        status: initialData?.status || TransactionStatus.PENDING,
        accountId: initialData?.accountId || '',
        date: initialData?.date || new Date(),
        toAccountId: initialData?.toAccountId || undefined,
        notes: initialData?.notes || undefined,
      });
    }
  }, [open, initialData]);

  const handleChange = (field: keyof CreateTransactionInput) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: field === 'amount'
        ? value === '' ? 0 : Number(value)
        : field === 'date'
        ? new Date(value)
        : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {initialData ? 'Edit Transaction' : 'Add Transaction'}
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={handleChange('description')}
                required
                placeholder="e.g., Grocery shopping"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Amount"
                value={formData.amount ?? ''}
                onChange={handleChange('amount')}
                required
                inputProps={{ step: '0.01', min: '0' }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Type"
                value={formData.type}
                onChange={handleChange('type')}
                required
              >
                {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {formData.type !== 'TRANSFER' && (
              <>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    freeSolo
                    options={existingCategories}
                    value={formData.category}
                    onChange={(_, newValue) => {
                      setFormData((prev) => ({ ...prev, category: newValue || '' }));
                    }}
                    onInputChange={(_, newValue) => {
                      setFormData((prev) => ({ ...prev, category: newValue }));
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Category"
                        required
                        placeholder="e.g., Groceries"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    select
                    label="Status"
                    value={formData.status}
                    onChange={handleChange('status')}
                    required
                  >
                    {Object.entries(TRANSACTION_STATUS_LABELS).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </>
            )}

            <Grid item xs={12} sm={formData.type === 'TRANSFER' ? 6 : 12}>
              <TextField
                fullWidth
                select
                label={formData.type === 'TRANSFER' ? 'From Account' : 'Account'}
                value={formData.accountId}
                onChange={handleChange('accountId')}
                required
              >
                {accounts?.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {formData.type === 'TRANSFER' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="To Account"
                  value={formData.toAccountId || ''}
                  onChange={handleChange('toAccountId')}
                  required
                  error={formData.toAccountId === formData.accountId}
                  helperText={
                    formData.toAccountId === formData.accountId
                      ? 'Destination must be different from source'
                      : ''
                  }
                >
                  {accounts
                    ?.filter((account) => account.id !== formData.accountId)
                    .map((account) => (
                      <MenuItem key={account.id} value={account.id}>
                        {account.name}
                      </MenuItem>
                    ))}
                </TextField>
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes (Optional)"
                value={formData.notes || ''}
                onChange={handleChange('notes')}
                multiline
                rows={2}
                placeholder="Add any additional notes or memo..."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Date"
                value={
                  formData.date instanceof Date
                    ? formData.date.toISOString().split('T')[0]
                    : formData.date
                }
                onChange={handleChange('date')}
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? 'Saving...' : initialData ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
