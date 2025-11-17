import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createTransactionSchema, transactionFiltersSchema } from '@/lib/validations/transaction';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// GET /api/transactions - Get transactions with filtering and pagination
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Build filter object, only including non-null values
    const filterParams: any = {};
    const accountId = searchParams.get('accountId');
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');

    if (accountId) filterParams.accountId = accountId;
    if (category) filterParams.category = category;
    if (type) filterParams.type = type;
    if (status) filterParams.status = status;
    if (startDate) filterParams.startDate = startDate;
    if (endDate) filterParams.endDate = endDate;
    if (search) filterParams.search = search;
    if (page) filterParams.page = page;
    if (limit) filterParams.limit = limit;

    const filters = transactionFiltersSchema.parse(filterParams);

    // Build where clause
    const where: Prisma.TransactionWhereInput = {
      userId: session.user.id,
    };

    if (filters.accountId) {
      where.accountId = filters.accountId;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.date.lte = filters.endDate;
      }
    }

    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { category: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Get total count for pagination
    const total = await prisma.transaction.count({ where });

    // Get transactions with pagination
    const transactions = await prisma.transaction.findMany({
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
      orderBy: { date: 'desc' },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    });

    return NextResponse.json({
      transactions,
      pagination: {
        total,
        page: filters.page,
        limit: filters.limit,
        pages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

// POST /api/transactions - Create a new transaction
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createTransactionSchema.parse(body);

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

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        ...validatedData,
        userId: session.user.id,
        date: validatedData.date || new Date(),
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

    // Update account balance
    const balanceChange = validatedData.type === 'INCOME'
      ? validatedData.amount
      : -validatedData.amount;

    await prisma.account.update({
      where: { id: validatedData.accountId },
      data: {
        balance: {
          increment: balanceChange,
        },
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
