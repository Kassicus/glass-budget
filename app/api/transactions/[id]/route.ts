import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateTransactionSchema } from '@/lib/validations/transaction';
import { z } from 'zod';

// GET /api/transactions/:id - Get a specific transaction
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        toAccount: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction' },
      { status: 500 }
    );
  }
}

// PUT /api/transactions/:id - Update a transaction
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get existing transaction
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateTransactionSchema.parse(body);

    // If account is being changed, verify new account belongs to user
    if (validatedData.accountId && validatedData.accountId !== existingTransaction.accountId) {
      const newAccount = await prisma.account.findFirst({
        where: {
          id: validatedData.accountId,
          userId: session.user.id,
        },
      });

      if (!newAccount) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }
    }

    // Get new values (use existing if not provided)
    const oldAmount = existingTransaction.amount;
    const oldType = existingTransaction.type;
    const oldAccountId = existingTransaction.accountId;
    const oldToAccountId = existingTransaction.toAccountId;

    const newAmount = validatedData.amount ?? oldAmount;
    const newType = validatedData.type ?? oldType;
    const newAccountId = validatedData.accountId ?? oldAccountId;
    const newToAccountId = validatedData.toAccountId ?? oldToAccountId;

    // Reverse old transaction effects
    if (oldType === 'TRANSFER' && oldToAccountId) {
      // Reverse transfer: add back to source, subtract from destination
      await prisma.account.update({
        where: { id: oldAccountId },
        data: { balance: { increment: oldAmount } },
      });
      await prisma.account.update({
        where: { id: oldToAccountId },
        data: { balance: { decrement: oldAmount } },
      });
    } else {
      // Reverse income/expense
      const oldBalanceChange = oldType === 'INCOME' ? -oldAmount : oldAmount;
      await prisma.account.update({
        where: { id: oldAccountId },
        data: { balance: { increment: oldBalanceChange } },
      });
    }

    // Apply new transaction effects
    if (newType === 'TRANSFER' && newToAccountId) {
      // Apply transfer: subtract from source, add to destination
      await prisma.account.update({
        where: { id: newAccountId },
        data: { balance: { decrement: newAmount } },
      });
      await prisma.account.update({
        where: { id: newToAccountId },
        data: { balance: { increment: newAmount } },
      });
    } else {
      // Apply income/expense
      const newBalanceChange = newType === 'INCOME' ? newAmount : -newAmount;
      await prisma.account.update({
        where: { id: newAccountId },
        data: { balance: { increment: newBalanceChange } },
      });
    }

    // Update transaction
    const transaction = await prisma.transaction.update({
      where: { id },
      data: validatedData,
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        toAccount: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

// DELETE /api/transactions/:id - Delete a transaction
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get transaction to reverse balance
    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Reverse balance changes
    if (transaction.type === 'TRANSFER' && transaction.toAccountId) {
      // Reverse transfer: add back to source, subtract from destination
      await prisma.account.update({
        where: { id: transaction.accountId },
        data: { balance: { increment: transaction.amount } },
      });
      await prisma.account.update({
        where: { id: transaction.toAccountId },
        data: { balance: { decrement: transaction.amount } },
      });
    } else {
      // Reverse income/expense
      const balanceChange = transaction.type === 'INCOME'
        ? -transaction.amount
        : transaction.amount;

      await prisma.account.update({
        where: { id: transaction.accountId },
        data: { balance: { increment: balanceChange } },
      });
    }

    // Delete transaction
    await prisma.transaction.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
