import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateBillSchema } from '@/lib/validations/bill';
import { z } from 'zod';

// GET /api/bills/:id - Get a specific bill
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

    const bill = await prisma.bill.findFirst({
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
      },
    });

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    return NextResponse.json(bill);
  } catch (error) {
    console.error('Error fetching bill:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bill' },
      { status: 500 }
    );
  }
}

// PUT /api/bills/:id - Update a bill
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

    // Verify bill belongs to user
    const existingBill = await prisma.bill.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingBill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateBillSchema.parse(body);

    // If account is being changed, verify new account belongs to user
    if (validatedData.accountId && validatedData.accountId !== existingBill.accountId) {
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

    // If it's a loan payment, verify the loan account exists
    if (validatedData.isLoanPayment && validatedData.loanAccountId) {
      const loanAccount = await prisma.account.findFirst({
        where: {
          id: validatedData.loanAccountId,
          userId: session.user.id,
          type: {
            in: ['PERSONAL_LOAN', 'AUTO_LOAN', 'MORTGAGE', 'STUDENT_LOAN'],
          },
        },
      });

      if (!loanAccount) {
        return NextResponse.json(
          { error: 'Loan account not found' },
          { status: 404 }
        );
      }
    }

    const bill = await prisma.bill.update({
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
      },
    });

    return NextResponse.json(bill);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Error updating bill:', error);
    return NextResponse.json(
      { error: 'Failed to update bill' },
      { status: 500 }
    );
  }
}

// DELETE /api/bills/:id - Delete a bill
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

    // Verify bill belongs to user
    const bill = await prisma.bill.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    await prisma.bill.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    console.error('Error deleting bill:', error);
    return NextResponse.json(
      { error: 'Failed to delete bill' },
      { status: 500 }
    );
  }
}
