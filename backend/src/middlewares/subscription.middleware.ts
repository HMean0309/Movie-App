import type { Request, Response, NextFunction } from 'express';
import { getCurrentSubscription } from '../modules/subscriptions/subscription.service';

export async function premiumOnly(req: Request, res: Response, next: NextFunction) {
  try {
    const sub = await getCurrentSubscription(req.user!.id);

    if (sub.plan.name !== 'PREMIUM' || sub.status !== 'ACTIVE') {
      res.status(403).json({
        success: false,
        message: 'Tính năng này chỉ dành cho thành viên PREMIUM',
      });
      return;
    }

    next();
  } catch {
    res.status(500).json({ success: false, message: 'Lỗi kiểm tra subscription' });
  }
}
