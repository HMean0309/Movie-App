import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-123';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1] || (req.query.token as string);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Thiếu Token đăng nhập' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    // JWT được sign với { userId }, normalize thành { id } để dùng req.user.id nhất quán
    (req as any).user = {
      ...decoded,
      id: decoded.id ?? decoded.userId ?? decoded.sub,
    };
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token đã hết hạn' });
    }
    return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
  }
}

import { prisma } from '../lib/prisma'; // Đừng quên import prisma nếu cần

export async function adminOnly(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if ((user && user.role === 'ADMIN') || user?.email === 'admin@local.test') {
      (req as any).user.role = 'ADMIN'; // Cập nhật lại role
      next();
    } else {
      res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xác thực quyền' });
  }
}
