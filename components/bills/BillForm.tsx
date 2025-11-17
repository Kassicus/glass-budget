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
  FormControlLabel,
  Checkbox,
  Autocomplete,
} from '@mui/material';
import { CreateBillInput } from '@/lib/validations/bill';
import { useAccounts } from '@/lib/hooks/useAccounts';
import { useCategories } from '@/lib/hooks/useCategories';

interface BillFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBillInput) => void;
  initialData?: Partial<CreateBillInput>;
  isLoading?: boolean;
  error?: string;
}

export function BillForm({
  open,
  onClose,
  onSubmit,
  initialData,
  isLoading,
  error,
}: BillFormProps) {
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const categoryNames = categories?.map((cat) => cat.name) || [];

  const [formData, setFormData] = useState<CreateBillInput>({
    name: '',
    amount: 0,
    category: '',
    dayOfMonth: 1,
    isActive: true,
    accountId: '',
    isLoanPayment: false,
    loanAccountId: undefined,
  });

  const loanAccounts = accounts?.filter((account) =>
    ['PERSONAL_LOAN', 'AUTO_LOAN', 'MORTGAGE', 'STUDENT_LOAN'].includes(account.type)
  );

  useEffect(() => {
    if (open) {
      setFormData({
        name: initialData?.name || '',
        amount: initialData?.amount ?? 0,
        category: initialData?.category || '',
        dayOfMonth: initialData?.dayOfMonth ?? 1,
        isActive: initialData?.isActive ?? true,
        accountId: initialData?.accountId || '',
        isLoanPayment: initialData?.isLoanPayment ?? false,
        loanAccountId: initialData?.loanAccountId || undefined,
      });
    }
  }, [open, initialData]);

  const handleChange = (field: keyof CreateBillInput) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]:
        field === 'amount'
          ? value === ''
            ? 0
            : Number(value)
          : field === 'dayOfMonth'
          ? value === ''
            ? 1
            : Number(value)
          : field === 'isActive' || field === 'isLoanPayment'
          ? (e.target as HTMLInputElement).checked
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
        <DialogTitle>{initialData ? 'Edit Bill' : 'Add Bill'}</DialogTitle>

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
                label="Bill Name"
                value={formData.name}
                onChange={handleChange('name')}
                required
                placeholder="e.g., Electric Bill"
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
                type="number"
                label="Day of Month (1-31)"
                value={formData.dayOfMonth ?? ''}
                onChange={handleChange('dayOfMonth')}
                required
                inputProps={{ min: '1', max: '31' }}
                helperText="Due day each month (bills on 29-31 will be due on last day of shorter months)"
              />
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                freeSolo
                options={categoryNames}
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
                    placeholder="Select or type a category"
                    helperText="Choose from your categories or type a new one"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Payment Account"
                value={formData.accountId}
                onChange={handleChange('accountId')}
                required
                helperText="Account used to pay this bill"
              >
                {accounts?.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.name} ({account.type})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isLoanPayment}
                    onChange={handleChange('isLoanPayment')}
                  />
                }
                label="This is a loan payment"
              />
            </Grid>

            {formData.isLoanPayment && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="Loan Account"
                  value={formData.loanAccountId || ''}
                  onChange={handleChange('loanAccountId')}
                  required={formData.isLoanPayment}
                  helperText="The loan account this payment applies to"
                >
                  {loanAccounts?.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.name} ({account.type})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isActive}
                    onChange={handleChange('isActive')}
                  />
                }
                label="Active"
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
