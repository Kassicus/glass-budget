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
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { formatCurrency } from '@/lib/utils/accounts';
import { getBillsCalendar, isBillPaidForMonth } from '@/lib/utils/bills';

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

export function BillsCalendar({ bills }: BillsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 2, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get calendar data
  const billsCalendar = getBillsCalendar(bills, currentMonth, currentYear);
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
                    minHeight: 120,
                    bgcolor: day ? 'background.paper' : 'background.default',
                    borderColor: isToday ? 'primary.main' : 'divider',
                    borderWidth: isToday ? 2 : 1,
                  }}
                >
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    {day && (
                      <>
                        <Typography
                          variant="body2"
                          fontWeight={isToday ? 700 : 500}
                          color={isToday ? 'primary.main' : 'text.primary'}
                          sx={{ mb: 0.5 }}
                        >
                          {day}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {dayBills.map((bill) => {
                            const isPaid = isBillPaidForMonth(
                              bill,
                              currentMonth,
                              currentYear
                            );
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
                                  </Box>
                                }
                                arrow
                              >
                                <Chip
                                  label={bill.name}
                                  size="small"
                                  color={isPaid ? 'success' : 'warning'}
                                  sx={{
                                    width: '100%',
                                    fontSize: '0.65rem',
                                    height: 'auto',
                                    '& .MuiChip-label': {
                                      display: 'block',
                                      whiteSpace: 'normal',
                                      py: 0.25,
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
      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
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
      </Box>
    </Box>
  );
}
