import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createBillSchema } from '@/lib/validations/bill';
import { z } from 'zod';

// GET /api/bills - Get all bills for the user
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');

    const where: any = {
      userId: session.user.id,
    };

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const bills = await prisma.bill.findMany({
      where,
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { dayOfMonth: 'asc' },
      ],
    });

    return NextResponse.json(bills);
  } catch (error) {
    console.error('Error fetching bills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bills' },
      { status: 500 }
    );
  }
}

// POST /api/bills - Create a new bill
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createBillSchema.parse(body);

    // Verify account belongs to user
    const account = await prisma.account.findFirst({
      where: {
        id: validatedData.accountId,
        userId: session.user.id,
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
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

    const bill = await prisma.bill.create({
      data: {
        ...validatedData,
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

    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Error creating bill:', error);
    return NextResponse.json(
      { error: 'Failed to create bill' },
      { status: 500 }
    );
  }
}
