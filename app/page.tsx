'use client';

import { Container, Typography, Box, Button, Paper } from '@mui/material';
import { useRouter } from 'next/navigation';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

export default function Home() {
  const router = useRouter();
  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Paper
          elevation={2}
          sx={{
            p: 6,
            maxWidth: 600,
            borderRadius: 2,
          }}
        >
          <AccountBalanceIcon sx={{ fontSize: 80, color: 'primary.main', mb: 3 }} />

          <Typography variant="h2" component="h1" gutterBottom fontWeight={600}>
            Glass Budget
          </Typography>

          <Typography variant="h5" color="text.secondary" paragraph>
            Professional Budget Management
          </Typography>

          <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4 }}>
            A trustworthy, performance-focused application for managing your personal finances.
            Track accounts, transactions, and bills with ease.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => router.push('/login')}
            >
              Login
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => router.push('/register')}
            >
              Register
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
