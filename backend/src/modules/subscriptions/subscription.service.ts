import { prisma } from '../../lib/prisma';

// Gán FREE plan cho user (dùng nội bộ)
async function assignFreePlan(userId: string) {
  const freePlan = await prisma.subscriptionPlan.findUnique({
    where: { name: 'FREE' },
  });
  if (!freePlan) throw new Error('FREE plan chưa được seed');

  return prisma.subscription.upsert({
    where: { userId },
    update: {
      planId: freePlan.id,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + freePlan.durationDays * 24 * 60 * 60 * 1000),
    },
    create: {
      userId,
      planId: freePlan.id,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + freePlan.durationDays * 24 * 60 * 60 * 1000),
    },
    include: { plan: true },
  });
}

// Lấy subscription hiện tại của user
export async function getCurrentSubscription(userId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  });

  // Chưa có → tạo FREE
  if (!sub) return assignFreePlan(userId);

  // PREMIUM hết hạn → downgrade FREE
  if (sub.status === 'ACTIVE' && sub.expiresAt < new Date()) {
    await prisma.subscription.update({
      where: { userId },
      data: { status: 'EXPIRED' },
    });
    return assignFreePlan(userId);
  }

  return sub;
}

// Nâng cấp PREMIUM (mock, thực tế gắn thêm payment gateway)
export async function upgradeToPremium(userId: string) {
  const premiumPlan = await prisma.subscriptionPlan.findUnique({
    where: { name: 'PREMIUM' },
  });
  if (!premiumPlan) throw new Error('PREMIUM plan chưa được seed');

  return prisma.subscription.upsert({
    where: { userId },
    update: {
      planId: premiumPlan.id,
      status: 'ACTIVE',
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + premiumPlan.durationDays * 24 * 60 * 60 * 1000),
    },
    create: {
      userId,
      planId: premiumPlan.id,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + premiumPlan.durationDays * 24 * 60 * 60 * 1000),
    },
    include: { plan: true },
  });
}

// Lấy tất cả plans (trang pricing)
export async function getAllPlans() {
  return prisma.subscriptionPlan.findMany({
    orderBy: { price: 'asc' },
  });
}
