import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
} from '@mui/material';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight={600}>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {session.user.name}!
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Assets
              </Typography>
              <Typography variant="h4" color="success.main" fontWeight={600}>
                $0.00
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Liabilities
              </Typography>
              <Typography variant="h4" color="error.main" fontWeight={600}>
                $0.00
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Net Worth
              </Typography>
              <Typography variant="h4" color="primary.main" fontWeight={600}>
                $0.00
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom fontWeight={600}>
          Getting Started
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This is your dashboard. Features coming soon:
        </Typography>
        <Box component="ul" sx={{ mt: 2 }}>
          <li>Account management</li>
          <li>Transaction tracking</li>
          <li>Bill management</li>
          <li>Savings goals</li>
          <li>Budget tracking</li>
          <li>Reports and analytics</li>
        </Box>
      </Box>
    </Container>
  );
}
