'use client';

import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import SavingsIcon from '@mui/icons-material/Savings';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HomeIcon from '@mui/icons-material/Home';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import SchoolIcon from '@mui/icons-material/School';
import MoneyIcon from '@mui/icons-material/Money';
import { Account, AccountType, LoanDetails } from '@prisma/client';
import { useState } from 'react';
import {
  getAccountDisplayBalance,
  calculateCreditUtilization,
  calculateLoanProgress,
  formatCurrency,
  formatPercentage,
  ACCOUNT_TYPE_LABELS,
} from '@/lib/utils/accounts';

type AccountWithDetails = Account & {
  loanDetails?: LoanDetails | null;
  _count?: {
    transactions: number;
    bills: number;
  };
};

interface AccountCardProps {
  account: AccountWithDetails;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
}

const ACCOUNT_ICONS: Record<AccountType, React.ReactNode> = {
  CHECKING: <AccountBalanceIcon />,
  SAVINGS: <SavingsIcon />,
  CREDIT: <CreditCardIcon />,
  INVESTMENT: <TrendingUpIcon />,
  MORTGAGE: <HomeIcon />,
  AUTO_LOAN: <DirectionsCarIcon />,
  STUDENT_LOAN: <SchoolIcon />,
  PERSONAL_LOAN: <MoneyIcon />,
};

export function AccountCard({ account, onEdit, onDelete, onClick }: AccountCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    onEdit?.();
  };

  const handleDelete = () => {
    handleMenuClose();
    onDelete?.();
  };

  const displayBalance = getAccountDisplayBalance(account);
  const isNegative = displayBalance < 0;

  return (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { boxShadow: 4 } : {},
        transition: 'box-shadow 0.2s',
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ color: 'primary.main' }}>
              {ACCOUNT_ICONS[account.type]}
            </Box>
            <Typography variant="h6" component="h3" noWrap>
              {account.name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={ACCOUNT_TYPE_LABELS[account.type]}
              size="small"
              color={isNegative ? 'error' : 'success'}
              variant="outlined"
            />
            {(onEdit || onDelete) && (
              <>
                <IconButton size="small" onClick={handleMenuClick}>
                  <MoreVertIcon />
                </IconButton>
                <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
                  {onEdit && <MenuItem onClick={handleEdit}>Edit</MenuItem>}
                  {onDelete && <MenuItem onClick={handleDelete}>Delete</MenuItem>}
                </Menu>
              </>
            )}
          </Box>
        </Box>

        <Typography
          variant="h4"
          sx={{
            mb: 2,
            fontWeight: 600,
            color: isNegative ? 'error.main' : 'success.main',
          }}
        >
          {formatCurrency(Math.abs(displayBalance))}
        </Typography>

        {/* Credit Card Utilization */}
        {account.type === AccountType.CREDIT && account.creditLimit && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                Credit Utilization
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {formatPercentage(calculateCreditUtilization(account))}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={calculateCreditUtilization(account)}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  backgroundColor:
                    calculateCreditUtilization(account) > 30 ? 'error.main' : 'success.main',
                },
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {formatCurrency(account.currentBalance || 0)} of {formatCurrency(account.creditLimit)}
            </Typography>
          </Box>
        )}

        {/* Loan Progress */}
        {account.loanDetails && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                Loan Progress
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {formatPercentage(calculateLoanProgress(account.loanDetails))}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={calculateLoanProgress(account.loanDetails)}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: 'primary.main',
                },
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {formatCurrency(account.loanDetails.currentPrincipal)} remaining of{' '}
              {formatCurrency(account.loanDetails.originalAmount)}
            </Typography>
          </Box>
        )}

        {/* Institution Info */}
        {account.institutionName && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {account.institutionName}
            {account.accountLast4 && ` •••• ${account.accountLast4}`}
          </Typography>
        )}

        {/* Transaction/Bill Count */}
        {account._count && (
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {account._count.transactions} transactions
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {account._count.bills} bills
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
