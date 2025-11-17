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
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="text.secondary">
                Total Assets
              </Typography>
              <Typography variant="h4" color="success.main" fontWeight={600}>
                {formatCurrency(stats?.totalAssets || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="text.secondary">
                Total Liabilities
              </Typography>
              <Typography variant="h4" color="error.main" fontWeight={600}>
                {formatCurrency(stats?.totalLiabilities || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="text.secondary">
                Net Worth
              </Typography>
              <Typography
                variant="h4"
                fontWeight={600}
                color={
                  (stats?.netWorth || 0) >= 0 ? 'success.main' : 'error.main'
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
                        color={transaction.type === 'INCOME' ? 'success.main' : 'error.main'}
                        fontWeight={500}
                      >
                        {transaction.type === 'INCOME' ? '+' : '-'}
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
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => router.push('/dashboard/transactions')}
              >
                Add Transaction
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => router.push('/dashboard/bills')}
              >
                Add Bill
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => router.push('/dashboard/goals')}
              >
                Add Savings Goal
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
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
