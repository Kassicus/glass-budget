import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { payBillSchema } from '@/lib/validations/bill';
import { z } from 'zod';

// POST /api/bills/:id/pay - Mark a bill as paid and optionally create a transaction
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the bill
    const bill = await prisma.bill.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        account: true,
      },
    });

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const body = await request.json();
    const { paidDate, createTransaction } = payBillSchema.parse(body);

    const paymentDate = paidDate || new Date();
    const paymentMonth = paymentDate.getMonth() + 1;
    const paymentYear = paymentDate.getFullYear();

    // Check if already paid for this month/year
    if (
      bill.isPaid &&
      bill.lastPaidMonth === paymentMonth &&
      bill.lastPaidYear === paymentYear
    ) {
      return NextResponse.json(
        { error: 'Bill already paid for this period' },
        { status: 400 }
      );
    }

    let transaction = null;

    // Only create a transaction if requested
    if (createTransaction) {
      // Create a transaction for the payment
      transaction = await prisma.transaction.create({
        data: {
          description: `Bill Payment: ${bill.name}`,
          amount: bill.amount,
          category: bill.category,
          type: 'EXPENSE',
          status: 'CLEARED',
          date: paymentDate,
          userId: session.user.id,
          accountId: bill.accountId,
        },
      });

      // Update account balance
      await prisma.account.update({
        where: { id: bill.accountId },
        data: {
          balance: {
            decrement: bill.amount,
          },
        },
      });

      // If it's a loan payment, update the loan balance
      if (bill.isLoanPayment && bill.loanAccountId) {
        await prisma.account.update({
          where: { id: bill.loanAccountId },
          data: {
            balance: {
              increment: bill.amount, // Reduces the loan balance (negative number becomes less negative)
            },
          },
        });
      }
    }

    // Update bill payment status
    const updatedBill = await prisma.bill.update({
      where: { id },
      data: {
        isPaid: true,
        paidDate: paymentDate,
        lastPaidMonth: paymentMonth,
        lastPaidYear: paymentYear,
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    return NextResponse.json({
      bill: updatedBill,
      transaction,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Error paying bill:', error);
    return NextResponse.json(
      { error: 'Failed to pay bill' },
      { status: 500 }
    );
  }
}

// DELETE /api/bills/:id/pay - Mark a bill as unpaid
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

    // Get the bill
    const bill = await prisma.bill.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    if (!bill.isPaid) {
      return NextResponse.json(
        { error: 'Bill is not marked as paid' },
        { status: 400 }
      );
    }

    // Update bill payment status
    const updatedBill = await prisma.bill.update({
      where: { id },
      data: {
        isPaid: false,
        paidDate: null,
        lastPaidMonth: null,
        lastPaidYear: null,
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    return NextResponse.json(updatedBill);
  } catch (error) {
    console.error('Error unmarking bill as paid:', error);
    return NextResponse.json(
      { error: 'Failed to update bill' },
      { status: 500 }
    );
  }
}
