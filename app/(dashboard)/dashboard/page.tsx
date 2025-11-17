'use client';

import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useAccounts } from '@/lib/hooks/useAccounts';
import { useTransactions } from '@/lib/hooks/useTransactions';
import { useBills } from '@/lib/hooks/useBills';
import { calculateNetWorth, formatCurrency } from '@/lib/utils/accounts';
import { AccountCard } from '@/components/accounts/AccountCard';
import { format } from 'date-fns';

export default function DashboardPage() {
  const router = useRouter();
  const { data: accounts, isLoading, error } = useAccounts();
  const { data: transactionsData } = useTransactions({ limit: 5 });
  const { data: bills } = useBills(true);

  const stats = accounts ? calculateNetWorth(accounts) : null;

  // Get upcoming bills (due in next 7 days)
  const getCurrentMonthYear = () => {
    const now = new Date();
    return {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      day: now.getDate(),
    };
  };

  const upcomingBills = bills?.filter((bill) => {
    const { month, year, day } = getCurrentMonthYear();
    const isPaidThisMonth = bill.isPaid && bill.lastPaidMonth === month && bill.lastPaidYear === year;
    const isDueSoon = bill.dayOfMonth >= day && bill.dayOfMonth <= day + 7;
    return !isPaidThisMonth && isDueSoon;
  }).slice(0, 5);

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Failed to load dashboard data. Please try again.</Alert>
      </Container>
    );
  }

  const hasAccounts = accounts && accounts.length > 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight={600}>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your financial overview
        </Typography>
      </Box>

      {/* Financial Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.1) 0%, rgba(16, 185, 129, 0.15) 100%)',
              border: '2px solid #34d399',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box
                  sx={{
                    background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
                    borderRadius: 2,
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: '0 4px 14px rgba(52, 211, 153, 0.4)',
                  }}
                >
                  <AddIcon fontSize="large" />
                </Box>
                <Typography variant="h6" fontWeight={600}>
                  Total Assets
                </Typography>
              </Box>
              <Typography variant="h3" color="success.main" fontWeight={700}>
                {formatCurrency(stats?.totalAssets || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, rgba(248, 113, 113, 0.1) 0%, rgba(239, 68, 68, 0.15) 100%)',
              border: '2px solid #f87171',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box
                  sx={{
                    background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
                    borderRadius: 2,
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: '0 4px 14px rgba(248, 113, 113, 0.4)',
                  }}
                >
                  <AddIcon fontSize="large" sx={{ transform: 'rotate(180deg)' }} />
                </Box>
                <Typography variant="h6" fontWeight={600}>
                  Total Liabilities
                </Typography>
              </Box>
              <Typography variant="h3" color="error.main" fontWeight={700}>
                {formatCurrency(stats?.totalLiabilities || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              background: (stats?.netWorth || 0) >= 0
                ? 'linear-gradient(135deg, rgba(96, 165, 250, 0.1) 0%, rgba(167, 139, 250, 0.15) 100%)'
                : 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.15) 100%)',
              border: (stats?.netWorth || 0) >= 0 ? '2px solid #60a5fa' : '2px solid #fbbf24',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box
                  sx={{
                    background: (stats?.netWorth || 0) >= 0
                      ? 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)'
                      : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    borderRadius: 2,
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: (stats?.netWorth || 0) >= 0
                      ? '0 4px 14px rgba(96, 165, 250, 0.4)'
                      : '0 4px 14px rgba(251, 191, 36, 0.4)',
                  }}
                >
                  <TrendingUpIcon fontSize="large" />
                </Box>
                <Typography variant="h6" fontWeight={600}>
                  Net Worth
                </Typography>
              </Box>
              <Typography
                variant="h3"
                fontWeight={700}
                color={
                  (stats?.netWorth || 0) >= 0 ? 'primary.main' : 'warning.main'
                }
              >
                {formatCurrency(stats?.netWorth || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Accounts Section */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight={600}>
          Recent Accounts
        </Typography>
        {hasAccounts && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => router.push('/dashboard/accounts')}
          >
            View All
          </Button>
        )}
      </Box>

      {!hasAccounts ? (
        <Card
          sx={{
            textAlign: 'center',
            py: 6,
            px: 3,
            border: '1px dashed',
            borderColor: 'divider',
            bgcolor: 'background.default',
          }}
        >
          <Typography variant="h6" gutterBottom>
            Get Started with Glass Budget
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Create your first account to start tracking your finances.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/dashboard/accounts')}
          >
            Add Your First Account
          </Button>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {accounts?.slice(0, 3).map((account) => (
            <Grid item xs={12} sm={6} md={4} key={account.id}>
              <AccountCard
                account={account}
                onClick={() => router.push(`/dashboard/accounts/${account.id}`)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Recent Transactions */}
      {hasAccounts && transactionsData && transactionsData.transactions.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" fontWeight={600}>
              Recent Transactions
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => router.push('/dashboard/transactions')}
            >
              View All
            </Button>
          </Box>
          <TableContainer component={Card}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactionsData.transactions.map((transaction) => (
                  <TableRow key={transaction.id} hover>
                    <TableCell>{format(new Date(transaction.date), 'MMM dd')}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>{transaction.category}</TableCell>
                    <TableCell>{transaction.account.name}</TableCell>
                    <TableCell align="right">
                      <Typography
                        color={
                          transaction.type === 'INCOME'
                            ? 'success.main'
                            : transaction.type === 'TRANSFER'
                            ? 'info.main'
                            : 'error.main'
                        }
                        fontWeight={500}
                      >
                        {transaction.type === 'INCOME'
                          ? '+'
                          : transaction.type === 'TRANSFER'
                          ? '↔'
                          : '-'}
                        {formatCurrency(transaction.amount)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Upcoming Bills */}
      {hasAccounts && upcomingBills && upcomingBills.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" fontWeight={600}>
              Upcoming Bills
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => router.push('/dashboard/bills')}
            >
              View All
            </Button>
          </Box>
          <TableContainer component={Card}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Bill Name</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {upcomingBills.map((bill) => (
                  <TableRow key={bill.id} hover>
                    <TableCell>{bill.name}</TableCell>
                    <TableCell>
                      {format(new Date().setDate(bill.dayOfMonth), 'MMM dd')}
                    </TableCell>
                    <TableCell>{bill.category}</TableCell>
                    <TableCell>{bill.account.name}</TableCell>
                    <TableCell align="right">
                      <Typography color="error.main" fontWeight={500}>
                        {formatCurrency(bill.amount)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Quick Actions */}
      {hasAccounts && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Quick Actions
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => router.push('/dashboard/transactions')}
              >
                Add Transaction
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => router.push('/dashboard/bills')}
              >
                Add Bill
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => router.push('/dashboard/accounts')}
              >
                Manage Accounts
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}
    </Container>
  );
}
