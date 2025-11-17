import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateAccountSchema } from '@/lib/validations/account';
import { z } from 'zod';

// GET /api/accounts/:id - Get a specific account
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const account = await prisma.account.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        loanDetails: true,
        transactions: {
          take: 10,
          orderBy: { date: 'desc' },
        },
        bills: {
          where: { isActive: true },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error('Error fetching account:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account' },
      { status: 500 }
    );
  }
}

// PUT /api/accounts/:id - Update an account
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
    const existingAccount = await prisma.account.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateAccountSchema.parse(body);

    const account = await prisma.account.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        loanDetails: true,
      },
    });

    return NextResponse.json(account);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Error updating account:', error);
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}

// DELETE /api/accounts/:id - Delete an account
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify account belongs to user
    const existingAccount = await prisma.account.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Delete account (cascades to transactions, bills, loan details)
    await prisma.account.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
