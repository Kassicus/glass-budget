'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Grid,
  Chip,
  Card,
  CardContent,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PaymentIcon from '@mui/icons-material/Payment';
import UndoIcon from '@mui/icons-material/Undo';
import { formatCurrency } from '@/lib/utils/accounts';
import { getBillsCalendar, isBillPaidForMonth, getBillsSplitTotals } from '@/lib/utils/bills';
import { useCategories } from '@/lib/hooks/useCategories';

interface Bill {
  id: string;
  name: string;
  amount: number;
  dayOfMonth: number;
  category: string;
  isPaid: boolean;
  lastPaidMonth: number | null;
  lastPaidYear: number | null;
  isActive: boolean;
}

interface BillsCalendarProps {
  bills: Bill[];
  onEdit?: (bill: Bill) => void;
  onDelete?: (billId: string) => void;
  onPay?: (bill: Bill) => void;
  onUnpay?: (bill: Bill) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function BillsCalendar({ bills, onEdit, onDelete, onPay, onUnpay }: BillsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { data: categories } = useCategories();

  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Create a map of category names to colors
  const categoryColorMap = new Map(
    categories?.map((cat) => [cat.name, cat.color]) || []
  );

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 2, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleBillClick = (event: React.MouseEvent<HTMLElement>, bill: Bill) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedBill(bill);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    if (selectedBill && onEdit) {
      onEdit(selectedBill);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedBill && onDelete) {
      onDelete(selectedBill.id);
    }
    setDeleteDialogOpen(false);
    setSelectedBill(null);
  };

  const handlePay = () => {
    if (selectedBill && onPay) {
      onPay(selectedBill);
    }
    handleMenuClose();
  };

  const handleUnpay = () => {
    if (selectedBill && onUnpay) {
      onUnpay(selectedBill);
    }
    handleMenuClose();
  };

  // Get calendar data
  const billsCalendar = getBillsCalendar(bills, currentMonth, currentYear);
  const splitTotals = getBillsSplitTotals(bills, currentMonth, currentYear);
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();

  // Create calendar grid
  const calendarDays: (number | null)[] = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }

  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const today = new Date();
  const isCurrentMonth =
    currentMonth === today.getMonth() + 1 && currentYear === today.getFullYear();
  const todayDate = isCurrentMonth ? today.getDate() : null;

  return (
    <Box>
      {/* Calendar Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h5" fontWeight={600}>
          {MONTHS[currentMonth - 1]} {currentYear}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={goToPreviousMonth} size="small">
            <ChevronLeftIcon />
          </IconButton>
          <Chip label="Today" onClick={goToToday} clickable size="small" />
          <IconButton onClick={goToNextMonth} size="small">
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Calendar Grid */}
      <Paper sx={{ p: 2 }}>
        {/* Day of week headers */}
        <Grid container spacing={1} sx={{ mb: 1 }}>
          {DAYS_OF_WEEK.map((day) => (
            <Grid item xs={12 / 7} key={day}>
              <Typography
                variant="body2"
                fontWeight={600}
                textAlign="center"
                color="text.secondary"
              >
                {day}
              </Typography>
            </Grid>
          ))}
        </Grid>

        {/* Calendar days */}
        <Grid container spacing={1}>
          {calendarDays.map((day, index) => {
            const dayBills = day ? billsCalendar.get(day) || [] : [];
            const isToday = day === todayDate;

            return (
              <Grid item xs={12 / 7} key={index}>
                <Card
                  variant="outlined"
                  sx={{
                    height: 140,
                    bgcolor: day ? 'background.paper' : 'background.default',
                    borderColor: isToday ? 'primary.main' : 'divider',
                    borderWidth: isToday ? 2 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <CardContent sx={{
                    p: 1,
                    '&:last-child': { pb: 1 },
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}>
                    {day && (
                      <>
                        <Typography
                          variant="body2"
                          fontWeight={isToday ? 700 : 500}
                          color={isToday ? 'primary.main' : 'text.primary'}
                          sx={{ mb: 0.5, flexShrink: 0 }}
                        >
                          {day}
                        </Typography>
                        <Box sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.5,
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          flex: 1,
                          '&::-webkit-scrollbar': {
                            width: '4px',
                          },
                          '&::-webkit-scrollbar-track': {
                            background: 'transparent',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '4px',
                          },
                          '&::-webkit-scrollbar-thumb:hover': {
                            background: 'rgba(0,0,0,0.3)',
                          },
                        }}>
                          {dayBills.map((bill) => {
                            const isPaid = isBillPaidForMonth(
                              bill,
                              currentMonth,
                              currentYear
                            );
                            const categoryColor = categoryColorMap.get(bill.category) || '#60a5fa';

                            return (
                              <Tooltip
                                key={bill.id}
                                title={
                                  <Box>
                                    <Typography variant="body2" fontWeight={600}>
                                      {bill.name}
                                    </Typography>
                                    <Typography variant="caption">
                                      {formatCurrency(bill.amount)}
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                      {bill.category}
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                      Status: {isPaid ? 'Paid' : 'Unpaid'}
                                    </Typography>
                                    <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                      Click for options
                                    </Typography>
                                  </Box>
                                }
                                arrow
                              >
                                <Chip
                                  label={bill.name}
                                  size="small"
                                  icon={isPaid ? <CheckCircleIcon /> : undefined}
                                  onClick={(e) => handleBillClick(e, bill)}
                                  sx={{
                                    width: '100%',
                                    fontSize: '0.65rem',
                                    height: 'auto',
                                    background: categoryColor,
                                    color: '#fff',
                                    fontWeight: 600,
                                    opacity: isPaid ? 0.6 : 1,
                                    cursor: 'pointer',
                                    '&:hover': {
                                      opacity: isPaid ? 0.8 : 0.9,
                                    },
                                    '& .MuiChip-label': {
                                      display: 'block',
                                      whiteSpace: 'normal',
                                      py: 0.25,
                                    },
                                    '& .MuiChip-icon': {
                                      color: '#fff',
                                      fontSize: '0.9rem',
                                    },
                                  }}
                                />
                              </Tooltip>
                            );
                          })}
                        </Box>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* Summary */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Chip
          label={`Total Bills: ${bills.filter((b) => b.isActive).length}`}
          color="primary"
          variant="outlined"
        />
        <Chip
          label={`Unpaid This Month: ${
            bills.filter(
              (b) =>
                b.isActive && !isBillPaidForMonth(b, currentMonth, currentYear)
            ).length
          }`}
          color="warning"
          variant="outlined"
        />
        <Chip
          label={`Total Amount: ${formatCurrency(
            bills
              .filter(
                (b) =>
                  b.isActive && !isBillPaidForMonth(b, currentMonth, currentYear)
              )
              .reduce((sum, b) => sum + b.amount, 0)
          )}`}
          color="error"
          variant="outlined"
        />
        <Chip
          label={`Remaining 1-15: ${formatCurrency(splitTotals.total1to15)}`}
          color="info"
          variant="outlined"
        />
        <Chip
          label={`Remaining 15-End: ${formatCurrency(splitTotals.total15toEnd)}`}
          color="secondary"
          variant="outlined"
        />
      </Box>

      {/* Bill Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>

        {selectedBill && isBillPaidForMonth(selectedBill, currentMonth, currentYear) ? (
          <MenuItem onClick={handleUnpay}>
            <ListItemIcon>
              <UndoIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Mark as Unpaid</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={handlePay}>
            <ListItemIcon>
              <PaymentIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Mark as Paid</ListItemText>
          </MenuItem>
        )}

        <MenuItem onClick={handleDeleteClick}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Bill</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedBill?.name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
