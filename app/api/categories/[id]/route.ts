import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateCategorySchema } from '@/lib/validations/category';
import { z } from 'zod';

// PUT /api/categories/:id - Update a category
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

    // Verify category belongs to user
    const existingCategory = await prisma.category.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateCategorySchema.parse(body);

    // If updating name, check for duplicates
    if (validatedData.name && validatedData.name !== existingCategory.name) {
      const duplicate = await prisma.category.findUnique({
        where: {
          userId_name: {
            userId: session.user.id,
            name: validatedData.name,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'A category with this name already exists' },
          { status: 400 }
        );
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/:id - Delete a category
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

    // Verify category belongs to user
    const existingCategory = await prisma.category.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Check if category is in use by transactions or bills
    const transactionCount = await prisma.transaction.count({
      where: {
        userId: session.user.id,
        category: existingCategory.name,
      },
    });

    const billCount = await prisma.bill.count({
      where: {
        userId: session.user.id,
        category: existingCategory.name,
      },
    });

    if (transactionCount > 0 || billCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category. It is used by ${transactionCount} transaction(s) and ${billCount} bill(s)`,
        },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
