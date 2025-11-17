import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { loanDetailsSchema, updateLoanDetailsSchema } from '@/lib/validations/account';
import { isLoanAccount } from '@/lib/utils/accounts';
import { z } from 'zod';

// POST /api/accounts/:id/loan-details - Create loan details for an account
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify account belongs to user and is a loan account
    const account = await prisma.account.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        loanDetails: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (!isLoanAccount(account.type)) {
      return NextResponse.json(
        { error: 'Account is not a loan account' },
        { status: 400 }
      );
    }

    if (account.loanDetails) {
      return NextResponse.json(
        { error: 'Loan details already exist for this account' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = loanDetailsSchema.parse(body);

    const loanDetails = await prisma.loanDetails.create({
      data: {
        ...validatedData,
        accountId: params.id,
      },
    });

    return NextResponse.json(loanDetails, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Error creating loan details:', error);
    return NextResponse.json(
      { error: 'Failed to create loan details' },
      { status: 500 }
    );
  }
}

// PUT /api/accounts/:id/loan-details - Update loan details
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify account belongs to user
    const account = await prisma.account.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        loanDetails: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (!account.loanDetails) {
      return NextResponse.json(
        { error: 'Loan details not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateLoanDetailsSchema.parse(body);

    const loanDetails = await prisma.loanDetails.update({
      where: { accountId: params.id },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(loanDetails);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Error updating loan details:', error);
    return NextResponse.json(
      { error: 'Failed to update loan details' },
      { status: 500 }
    );
  }
}
