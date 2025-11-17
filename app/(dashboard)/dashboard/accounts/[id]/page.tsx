'use client';

import { use } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Paper,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import { useAccount } from '@/lib/hooks/useAccounts';
import { useTransactions } from '@/lib/hooks/useTransactions';
import { formatCurrency } from '@/lib/utils/accounts';
import { format } from 'date-fns';

interface AccountDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AccountDetailPage({ params }: AccountDetailPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { data: account, isLoading, error } = useAccount(resolvedParams.id);
  const { data: transactionsData } = useTransactions({
    accountId: resolvedParams.id,
    limit: 50,
  });

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !account) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Failed to load account details. Please try again.</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/dashboard/accounts')}
          sx={{ mt: 2 }}
        >
          Back to Accounts
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/dashboard/accounts')}
        >
          Back
        </Button>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h3" component="h1" gutterBottom fontWeight={600}>
              {account.name}
            </Typography>
            <Chip label={account.type} color="primary" sx={{ textTransform: 'capitalize' }} />
          </Box>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => router.push('/dashboard/accounts')}
          >
            Edit Account
          </Button>
        </Box>
      </Box>

      {/* Account Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="text.secondary">
                Current Balance
              </Typography>
              <Typography
                variant="h4"
                fontWeight={600}
                color={account.balance >= 0 ? 'success.main' : 'error.main'}
              >
                {formatCurrency(account.balance)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {account.type === 'CREDIT' && (
          <>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="text.secondary">
                    Credit Limit
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    {formatCurrency(account.creditLimit || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="text.secondary">
                    Available Credit
                  </Typography>
                  <Typography variant="h4" fontWeight={600} color="success.main">
                    {formatCurrency((account.creditLimit || 0) + account.balance)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>

      {/* Recent Transactions */}
      {transactionsData && transactionsData.transactions.length > 0 && (
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
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactionsData.transactions.map((transaction) => (
                  <TableRow key={transaction.id} hover>
                    <TableCell>{format(new Date(transaction.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>{transaction.category}</TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.status}
                        size="small"
                        color={
                          transaction.status === 'RECONCILED'
                            ? 'success'
                            : transaction.status === 'CLEARED'
                            ? 'primary'
                            : 'default'
                        }
                        variant="outlined"
                      />
                    </TableCell>
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

      {transactionsData && transactionsData.transactions.length === 0 && (
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
            No Transactions Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            This account doesn't have any transactions yet.
          </Typography>
          <Button
            variant="contained"
            onClick={() => router.push('/dashboard/transactions')}
          >
            Add Transaction
          </Button>
        </Card>
      )}
    </Container>
  );
}
