import type { Request, Response } from 'express';
import * as subService from './subscription.service';

export async function getMySubscriptionHandler(req: Request, res: Response) {
  try {
    const sub = await subService.getCurrentSubscription(req.user!.id);
    res.json({ success: true, data: sub });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function upgradeHandler(req: Request, res: Response) {
  try {
    const sub = await subService.upgradeToPremium(req.user!.id);
    res.json({ success: true, data: sub, message: 'Nâng cấp PREMIUM thành công!' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAllPlansHandler(req: Request, res: Response) {
  try {
    const plans = await subService.getAllPlans();
    res.json({ success: true, data: plans });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
