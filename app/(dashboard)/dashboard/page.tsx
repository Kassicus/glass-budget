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
} from '@mui/material';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import { useAccounts } from '@/lib/hooks/useAccounts';
import { calculateNetWorth, formatCurrency } from '@/lib/utils/accounts';
import { AccountCard } from '@/components/accounts/AccountCard';

export default function DashboardPage() {
  const router = useRouter();
  const { data: accounts, isLoading, error } = useAccounts();

  const stats = accounts ? calculateNetWorth(accounts) : null;

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
