import { prisma } from '@/lib/prisma';
import { DEFAULT_CATEGORIES } from '@/lib/constants/categories';

/**
 * Ensure default categories exist for a user
 * Creates them if they don't exist
 */
export async function ensureDefaultCategories(userId: string) {
  try {
    // Check if user has any categories
    const existingCount = await prisma.category.count({
      where: { userId },
    });

    // If user has no categories, create the default ones
    if (existingCount === 0) {
      // Use create in a loop for SQLite compatibility (doesn't support skipDuplicates)
      for (const cat of DEFAULT_CATEGORIES) {
        try {
          await prisma.category.create({
            data: {
              name: cat.name,
              color: cat.color,
              userId,
            },
          });
        } catch (err) {
          // Ignore duplicate errors
          if (!(err instanceof Error && err.message.includes('Unique constraint'))) {
            throw err;
          }
        }
      }
    }
  } catch (error) {
    console.error('Error ensuring default categories:', error);
  }
}
