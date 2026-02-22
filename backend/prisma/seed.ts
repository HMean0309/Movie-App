import { prisma } from '../src/lib/prisma';

async function main() {
  await prisma.subscriptionPlan.upsert({
    where: { name: 'FREE' },
    update: {},
    create: {
      name: 'FREE',
      price: 0,
      maxStreams: 1,
      durationDays: 36500,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { name: 'PREMIUM' },
    update: {},
    create: {
      name: 'PREMIUM',
      price: 79000,
      maxStreams: 2,
      durationDays: 30,
    },
  });

  // Create default admin user
  const adminEmail = 'admin@gmail.com';
  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);

    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashedPassword,
        fullName: 'Administrator',
        role: 'ADMIN',
      },
    });
    console.log('✅ Admin user created successfully (admin@gmail.com / admin123)');
  } else {
    console.log('ℹ️ Admin user already exists');
  }

}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
