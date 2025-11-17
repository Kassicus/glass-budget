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
  Box,
} from '@mui/material';
import { AccountType } from '@prisma/client';
import { ACCOUNT_TYPE_LABELS, isLoanAccount } from '@/lib/utils/accounts';
import { CreateAccountInput } from '@/lib/validations/account';

interface AccountFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAccountInput) => void;
  initialData?: Partial<CreateAccountInput>;
  isLoading?: boolean;
  error?: string;
}

export function AccountForm({
  open,
  onClose,
  onSubmit,
  initialData,
  isLoading,
  error,
}: AccountFormProps) {
  const [formData, setFormData] = useState<CreateAccountInput>({
    name: '',
    type: AccountType.CHECKING,
    balance: 0,
    creditLimit: undefined,
    currentBalance: undefined,
    institutionName: '',
    accountLast4: '',
  });

  // Update form data when initialData changes or modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: initialData?.name || '',
        type: initialData?.type || AccountType.CHECKING,
        balance: initialData?.balance ?? 0,
        creditLimit: initialData?.creditLimit ?? undefined,
        currentBalance: initialData?.currentBalance ?? undefined,
        institutionName: initialData?.institutionName || '',
        accountLast4: initialData?.accountLast4 || '',
      });
    }
  }, [open, initialData]);

  const handleChange = (field: keyof CreateAccountInput) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: field === 'balance' || field === 'creditLimit' || field === 'currentBalance'
        ? value === '' ? undefined : Number(value)
        : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isCreditAccount = formData.type === AccountType.CREDIT;
  const isLoan = isLoanAccount(formData.type);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {initialData ? 'Edit Account' : 'Create New Account'}
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
                label="Account Name"
                value={formData.name}
                onChange={handleChange('name')}
                required
                placeholder="e.g., Chase Checking"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Account Type"
                value={formData.type}
                onChange={handleChange('type')}
                required
              >
                {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {!isCreditAccount && !isLoan && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Current Balance"
                  value={formData.balance ?? ''}
                  onChange={handleChange('balance')}
                  inputProps={{ step: '0.01' }}
                  helperText="The current balance in this account"
                />
              </Grid>
            )}

            {isCreditAccount && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Credit Limit"
                    value={formData.creditLimit ?? ''}
                    onChange={handleChange('creditLimit')}
                    inputProps={{ step: '0.01' }}
                    helperText="Maximum credit available"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Current Balance"
                    value={formData.currentBalance ?? ''}
                    onChange={handleChange('currentBalance')}
                    inputProps={{ step: '0.01' }}
                    helperText="Amount currently owed"
                  />
                </Grid>
              </>
            )}

            {isLoan && (
              <Grid item xs={12}>
                <Alert severity="info">
                  Loan details can be added after creating the account.
                </Alert>
              </Grid>
            )}

            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Institution Name"
                value={formData.institutionName}
                onChange={handleChange('institutionName')}
                placeholder="e.g., Chase Bank"
                helperText="Optional: Bank or institution name"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Last 4 Digits"
                value={formData.accountLast4}
                onChange={handleChange('accountLast4')}
                placeholder="1234"
                inputProps={{ maxLength: 4, pattern: '[0-9]*' }}
                helperText="Last 4 of account #"
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? 'Saving...' : initialData ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
