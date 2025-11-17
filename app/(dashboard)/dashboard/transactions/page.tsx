'use client';

import { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  TextField,
  MenuItem,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem as MenuItemComponent,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { TransactionType, TransactionStatus } from '@prisma/client';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from '@/lib/hooks/useTransactions';
import { useAccounts } from '@/lib/hooks/useAccounts';
import { CreateTransactionInput, TransactionFilters } from '@/lib/validations/transaction';
import { formatCurrency } from '@/lib/utils/accounts';
import { format } from 'date-fns';

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<Partial<TransactionFilters>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const { data: accountsData } = useAccounts();
  const { data, isLoading } = useTransactions({ ...filters, page, limit: pageSize });
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();

  const handleCreate = () => {
    setEditingTransaction(null);
    setFormOpen(true);
  };

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingTransaction(null);
  };

  const handleSubmit = async (formData: CreateTransactionInput) => {
    try {
      if (editingTransaction) {
        await updateTransaction.mutateAsync({ id: editingTransaction.id, data: formData });
        setSnackbar({
          open: true,
          message: 'Transaction updated successfully',
          severity: 'success',
        });
      } else {
        await createTransaction.mutateAsync(formData);
        setSnackbar({
          open: true,
          message: 'Transaction created successfully',
          severity: 'success',
        });
      }
      handleFormClose();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'An error occurred',
        severity: 'error',
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    setTransactionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;

    try {
      await deleteTransaction.mutateAsync(transactionToDelete);
      setSnackbar({
        open: true,
        message: 'Transaction deleted successfully',
        severity: 'success',
      });
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to delete transaction',
        severity: 'error',
      });
    }
  };

  const handleMarkAsCleared = async (transaction: any) => {
    if (transaction.status === 'CLEARED' || transaction.status === 'RECONCILED') {
      setSnackbar({
        open: true,
        message: 'Transaction is already cleared or reconciled',
        severity: 'info',
      });
      return;
    }

    try {
      await updateTransaction.mutateAsync({
        id: transaction.id,
        data: { status: TransactionStatus.CLEARED },
      });
      setSnackbar({
        open: true,
        message: 'Transaction marked as cleared',
        severity: 'success',
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to update transaction',
        severity: 'error',
      });
    }
  };

  const handleMarkAsReconciled = async (transaction: any) => {
    if (transaction.status === 'RECONCILED') {
      setSnackbar({
        open: true,
        message: 'Transaction is already reconciled',
        severity: 'info',
      });
      return;
    }

    try {
      await updateTransaction.mutateAsync({
        id: transaction.id,
        data: { status: TransactionStatus.RECONCILED },
      });
      setSnackbar({
        open: true,
        message: 'Transaction marked as reconciled',
        severity: 'success',
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to update transaction',
        severity: 'error',
      });
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'date',
      headerName: 'Date',
      width: 120,
      valueFormatter: (value) => format(new Date(value), 'MMM dd, yyyy'),
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 130,
    },
    {
      field: 'account',
      headerName: 'Account',
      width: 150,
      valueGetter: (value, row) => row.account?.name || '',
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'INCOME' ? 'success' : 'error'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => formatCurrency(value),
      cellClassName: (params) =>
        params.row.type === 'INCOME' ? 'text-success' : 'text-error',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={
            params.value === 'RECONCILED'
              ? 'success'
              : params.value === 'CLEARED'
              ? 'primary'
              : 'default'
          }
          variant="outlined"
        />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 150,
      getActions: (params) => {
        const actions = [
          <GridActionsCellItem
            icon={<EditIcon />}
            label="Edit"
            onClick={() => handleEdit(params.row)}
            key="edit"
          />,
        ];

        // Add Mark as Cleared button if status is PENDING
        if (params.row.status === 'PENDING') {
          actions.push(
            <GridActionsCellItem
              icon={<CheckCircleIcon />}
              label="Mark as Cleared"
              onClick={() => handleMarkAsCleared(params.row)}
              key="cleared"
              showInMenu
            />
          );
        }

        // Add Mark as Reconciled button if status is PENDING or CLEARED
        if (params.row.status === 'PENDING' || params.row.status === 'CLEARED') {
          actions.push(
            <GridActionsCellItem
              icon={<DoneAllIcon />}
              label="Mark as Reconciled"
              onClick={() => handleMarkAsReconciled(params.row)}
              key="reconciled"
              showInMenu
            />
          );
        }

        actions.push(
          <GridActionsCellItem
            icon={<DeleteIcon />}
            label="Delete"
            onClick={() => handleDeleteClick(params.row.id)}
            key="delete"
            showInMenu
          />
        );

        return actions;
      },
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h3" component="h1" fontWeight={600}>
          Transactions
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            Add Transaction
          </Button>
        </Box>
      </Box>

      {showFilters && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                select
                label="Account"
                value={filters.accountId || ''}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, accountId: e.target.value || undefined }))
                }
              >
                <MenuItem value="">All Accounts</MenuItem>
                {accountsData?.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                select
                label="Type"
                value={filters.type || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    type: e.target.value as TransactionType | undefined,
                  }))
                }
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value={TransactionType.INCOME}>Income</MenuItem>
                <MenuItem value={TransactionType.EXPENSE}>Expense</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                select
                label="Status"
                value={filters.status || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: e.target.value as TransactionStatus | undefined,
                  }))
                }
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value={TransactionStatus.PENDING}>Pending</MenuItem>
                <MenuItem value={TransactionStatus.CLEARED}>Cleared</MenuItem>
                <MenuItem value={TransactionStatus.RECONCILED}>Reconciled</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Search"
                placeholder="Description or category..."
                value={filters.search || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={data?.transactions || []}
          columns={columns}
          paginationMode="server"
          rowCount={data?.pagination.total || 0}
          pageSizeOptions={[10, 20, 50, 100]}
          paginationModel={{ page: page - 1, pageSize }}
          onPaginationModelChange={(model) => {
            setPage(model.page + 1);
            setPageSize(model.pageSize);
          }}
          loading={isLoading}
          disableRowSelectionOnClick
          sx={{
            '& .text-success': {
              color: 'success.main',
            },
            '& .text-error': {
              color: 'error.main',
            },
          }}
        />
      </Paper>

      <TransactionForm
        open={formOpen}
        onClose={handleFormClose}
        onSubmit={handleSubmit}
        initialData={editingTransaction}
        isLoading={createTransaction.isPending || updateTransaction.isPending}
        error={createTransaction.error?.message || updateTransaction.error?.message}
      />

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Transaction</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this transaction? This will also reverse the balance
            change on the associated account.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteTransaction.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteTransaction.isPending}
          >
            {deleteTransaction.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
