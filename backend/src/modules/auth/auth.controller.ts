import type { Request, Response } from 'express';
import * as authService from './auth.service';

export async function registerHandler(req: Request, res: Response) {
  try {
    const tokens = await authService.register(req.body);
    res.json({ success: true, data: tokens });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function loginHandler(req: Request, res: Response) {
  try {
    const tokens = await authService.login(req.body);
    res.json({ success: true, data: tokens });
  } catch (err: any) {
    res.status(401).json({ success: false, message: err.message });
  }
}

export async function getProfileHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const profile = await authService.getProfile(userId);
    res.json({ success: true, data: profile });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
}

export async function updateProfileHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const { fullName, avatarUrl } = req.body;
    const user = await authService.updateProfile(userId, fullName, avatarUrl);
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
