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

}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
