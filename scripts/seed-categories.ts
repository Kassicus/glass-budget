import { PrismaClient } from '@prisma/client';
import { DEFAULT_CATEGORIES } from '../lib/constants/categories';

const prisma = new PrismaClient();

async function seedCategories() {
  try {
    console.log('Starting category seeding...');

    // Get all users
    const users = await prisma.user.findMany();

    console.log(`Found ${users.length} users`);

    for (const user of users) {
      console.log(`Seeding categories for user: ${user.username}`);

      // Check if user already has categories
      const existingCount = await prisma.category.count({
        where: { userId: user.id },
      });

      if (existingCount > 0) {
        console.log(`  User already has ${existingCount} categories, skipping...`);
        continue;
      }

      // Create default categories
      for (const cat of DEFAULT_CATEGORIES) {
        try {
          await prisma.category.create({
            data: {
              name: cat.name,
              color: cat.color,
              userId: user.id,
            },
          });
        } catch (err) {
          // Ignore duplicate errors
          console.log(`    Skipping duplicate: ${cat.name}`);
        }
      }

      console.log(`  Created ${DEFAULT_CATEGORIES.length} categories`);
    }

    console.log('Seeding completed!');
  } catch (error) {
    console.error('Error seeding categories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedCategories();
