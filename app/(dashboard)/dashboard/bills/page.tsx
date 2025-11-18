'use client';

import { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Chip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PaymentIcon from '@mui/icons-material/Payment';
import UndoIcon from '@mui/icons-material/Undo';
import ViewListIcon from '@mui/icons-material/ViewList';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { BillForm } from '@/components/bills/BillForm';
import { BillsCalendar } from '@/components/bills/BillsCalendar';
import {
  useBills,
  useCreateBill,
  useUpdateBill,
  useDeleteBill,
  usePayBill,
  useUnpayBill,
} from '@/lib/hooks/useBills';
import { CreateBillInput } from '@/lib/validations/bill';
import { formatCurrency } from '@/lib/utils/accounts';

export default function BillsPage() {
  const [showInactive, setShowInactive] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [formOpen, setFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<string | null>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [billToPay, setBillToPay] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info',
  });

  const { data: bills, isLoading } = useBills(showInactive ? undefined : true);
  const createBill = useCreateBill();
  const updateBill = useUpdateBill();
  const deleteBill = useDeleteBill();
  const payBill = usePayBill();
  const unpayBill = useUnpayBill();

  const handleCreate = () => {
    setEditingBill(null);
    setFormOpen(true);
  };

  const handleEdit = (bill: any) => {
    setEditingBill(bill);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingBill(null);
  };

  const handleSubmit = async (formData: CreateBillInput) => {
    try {
      if (editingBill) {
        await updateBill.mutateAsync({ id: editingBill.id, data: formData });
        setSnackbar({
          open: true,
          message: 'Bill updated successfully',
          severity: 'success',
        });
      } else {
        await createBill.mutateAsync(formData);
        setSnackbar({
          open: true,
          message: 'Bill created successfully',
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
    setBillToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!billToDelete) return;

    try {
      await deleteBill.mutateAsync(billToDelete);
      setSnackbar({
        open: true,
        message: 'Bill deleted successfully',
        severity: 'success',
      });
      setDeleteDialogOpen(false);
      setBillToDelete(null);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to delete bill',
        severity: 'error',
      });
    }
  };

  const handlePayBillClick = (bill: any) => {
    setBillToPay(bill);
    setPayDialogOpen(true);
  };

  const handlePayBill = async (createTransaction: boolean) => {
    if (!billToPay) return;

    try {
      await payBill.mutateAsync({
        id: billToPay.id,
        data: { createTransaction }
      });
      setSnackbar({
        open: true,
        message: `${billToPay.name} marked as paid${createTransaction ? ' and transaction created' : ''}`,
        severity: 'success',
      });
      setPayDialogOpen(false);
      setBillToPay(null);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to pay bill',
        severity: 'error',
      });
    }
  };

  const handleUnpayBill = async (bill: any) => {
    try {
      await unpayBill.mutateAsync(bill.id);
      setSnackbar({
        open: true,
        message: `${bill.name} marked as unpaid`,
        severity: 'success',
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to unmark bill',
        severity: 'error',
      });
    }
  };

  const getCurrentMonthYear = () => {
    const now = new Date();
    return {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };
  };

  const isBillPaidThisMonth = (bill: any) => {
    const { month, year } = getCurrentMonthYear();
    return bill.isPaid && bill.lastPaidMonth === month && bill.lastPaidYear === year;
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Bill Name',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => formatCurrency(value),
    },
    {
      field: 'dayOfMonth',
      headerName: 'Due Day',
      width: 90,
      valueFormatter: (value) => `${value}${getDaySuffix(value)}`,
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 150,
    },
    {
      field: 'account',
      headerName: 'Payment Account',
      width: 180,
      valueGetter: (value, row) => row.account?.name || '',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const isPaidThisMonth = isBillPaidThisMonth(params.row);
        return (
          <Chip
            label={isPaidThisMonth ? 'Paid' : 'Unpaid'}
            size="small"
            color={isPaidThisMonth ? 'success' : 'warning'}
            variant="outlined"
          />
        );
      },
    },
    {
      field: 'isActive',
      headerName: 'Active',
      width: 90,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Yes' : 'No'}
          size="small"
          color={params.value ? 'success' : 'default'}
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
        const isPaidThisMonth = isBillPaidThisMonth(params.row);
        const actions = [
          <GridActionsCellItem
            icon={<EditIcon />}
            label="Edit"
            onClick={() => handleEdit(params.row)}
            key="edit"
          />,
        ];

        if (isPaidThisMonth) {
          actions.push(
            <GridActionsCellItem
              icon={<UndoIcon />}
              label="Mark as Unpaid"
              onClick={() => handleUnpayBill(params.row)}
              key="unpay"
              showInMenu
            />
          );
        } else {
          actions.push(
            <GridActionsCellItem
              icon={<PaymentIcon />}
              label="Mark as Paid"
              onClick={() => handlePayBillClick(params.row)}
              key="pay"
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
          Bills
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={viewMode === 'list' ? 'contained' : 'outlined'}
              startIcon={<ViewListIcon />}
              onClick={() => setViewMode('list')}
              size="small"
            >
              List
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'contained' : 'outlined'}
              startIcon={<CalendarMonthIcon />}
              onClick={() => setViewMode('calendar')}
              size="small"
            >
              Calendar
            </Button>
          </Box>
          {viewMode === 'list' && (
            <FormControlLabel
              control={
                <Switch
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
              }
              label="Show Inactive"
            />
          )}
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            Add Bill
          </Button>
        </Box>
      </Box>

      {viewMode === 'list' ? (
        <Paper sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={bills || []}
            columns={columns}
            loading={isLoading}
            disableRowSelectionOnClick
            initialState={{
              sorting: {
                sortModel: [{ field: 'dayOfMonth', sort: 'asc' }],
              },
            }}
          />
        </Paper>
      ) : (
        <BillsCalendar
          bills={bills || []}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onPay={handlePayBillClick}
          onUnpay={handleUnpayBill}
        />
      )}

      <BillForm
        open={formOpen}
        onClose={handleFormClose}
        onSubmit={handleSubmit}
        initialData={editingBill}
        isLoading={createBill.isPending || updateBill.isPending}
        error={createBill.error?.message || updateBill.error?.message}
      />

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Bill</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this bill? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteBill.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteBill.isPending}
          >
            {deleteBill.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={payDialogOpen} onClose={() => setPayDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Pay Bill</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            How would you like to mark <strong>{billToPay?.name}</strong> as paid?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Amount: {formatCurrency(billToPay?.amount || 0)}
          </Typography>
        </DialogContent>
        <DialogActions sx={{
          flexDirection: 'column',
          gap: 1.5,
          alignItems: 'stretch',
          px: 3,
          pb: 2.5,
          pt: 1
        }}>
          <Button
            onClick={() => handlePayBill(true)}
            color="primary"
            variant="contained"
            disabled={payBill.isPending}
          >
            Mark as Paid & Create Transaction
          </Button>
          <Button
            onClick={() => handlePayBill(false)}
            color="secondary"
            variant="outlined"
            disabled={payBill.isPending}
          >
            Mark as Paid Only
          </Button>
          <Button
            onClick={() => {
              setPayDialogOpen(false);
              setBillToPay(null);
            }}
            disabled={payBill.isPending}
          >
            Cancel
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

function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}
