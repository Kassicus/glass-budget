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
  CHECKING: <AccountBalanceIcon fontSize="large" />,
  SAVINGS: <SavingsIcon fontSize="large" />,
  CREDIT: <CreditCardIcon fontSize="large" />,
  INVESTMENT: <TrendingUpIcon fontSize="large" />,
  MORTGAGE: <HomeIcon fontSize="large" />,
  AUTO_LOAN: <DirectionsCarIcon fontSize="large" />,
  STUDENT_LOAN: <SchoolIcon fontSize="large" />,
  PERSONAL_LOAN: <MoneyIcon fontSize="large" />,
};

const ACCOUNT_COLORS: Record<AccountType, { bg: string; color: string }> = {
  CHECKING: { bg: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', color: '#60a5fa' },
  SAVINGS: { bg: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)', color: '#34d399' },
  CREDIT: { bg: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)', color: '#f87171' },
  INVESTMENT: { bg: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', color: '#a78bfa' },
  MORTGAGE: { bg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#fbbf24' },
  AUTO_LOAN: { bg: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)', color: '#fb923c' },
  STUDENT_LOAN: { bg: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)', color: '#38bdf8' },
  PERSONAL_LOAN: { bg: 'linear-gradient(135deg, #c084fc 0%, #a855f7 100%)', color: '#c084fc' },
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

  const handleEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    handleMenuClose();
    onEdit?.();
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                background: ACCOUNT_COLORS[account.type].bg,
                borderRadius: 2,
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: `0 4px 14px ${ACCOUNT_COLORS[account.type].color}40`,
              }}
            >
              {ACCOUNT_ICONS[account.type]}
            </Box>
            <Box>
              <Typography variant="h6" component="h3" noWrap fontWeight={600}>
                {account.name}
              </Typography>
              <Chip
                label={ACCOUNT_TYPE_LABELS[account.type]}
                size="small"
                sx={{
                  mt: 0.5,
                  background: ACCOUNT_COLORS[account.type].bg,
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              />
            </Box>
          </Box>
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

        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 2,
            background: isNegative
              ? 'linear-gradient(135deg, rgba(248, 113, 113, 0.1) 0%, rgba(239, 68, 68, 0.1) 100%)'
              : 'linear-gradient(135deg, rgba(52, 211, 153, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
            border: `2px solid ${isNegative ? '#f87171' : '#34d399'}`,
          }}
        >
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            Current Balance
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: isNegative ? 'error.main' : 'success.main',
            }}
          >
            {formatCurrency(Math.abs(displayBalance))}
          </Typography>
        </Box>

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
                height: 8,
                borderRadius: 4,
                backgroundColor: 'rgba(148, 163, 184, 0.2)',
                '& .MuiLinearProgress-bar': {
                  background: calculateCreditUtilization(account) > 30
                    ? 'linear-gradient(90deg, #f87171 0%, #ef4444 100%)'
                    : 'linear-gradient(90deg, #34d399 0%, #10b981 100%)',
                  borderRadius: 4,
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
                height: 8,
                borderRadius: 4,
                backgroundColor: 'rgba(148, 163, 184, 0.2)',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #60a5fa 0%, #a78bfa 100%)',
                  borderRadius: 4,
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
