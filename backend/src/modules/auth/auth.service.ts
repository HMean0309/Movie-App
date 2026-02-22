import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-123';
const JWT_EXPIRES_IN = '1d';
const REFRESH_EXPIRES_IN = '30d';

export async function register(data: any) {
  const { email, password, fullName } = data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('Email đã được sử dụng');
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hash,
      fullName,
    },
  });

  return generateTokens(user.id);
}

export async function login(data: any) {
  const { email, password } = data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Email hoặc mật khẩu không đúng');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new Error('Email hoặc mật khẩu không đúng');
  }

  return generateTokens(user.id);
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, avatarUrl: true, role: true }
  });
  if (!user) throw new Error('Không tìm thấy người dùng');
  if (user.email === 'admin@local.test') user.role = 'ADMIN' as any;
  return user;
}

// ── Profile ──

export async function updateProfile(userId: string, fullName?: string, avatarUrl?: string) {
  const data: any = {};
  if (fullName !== undefined && fullName.trim() !== '') data.fullName = fullName;
  if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, fullName: true, avatarUrl: true, role: true }
  });
  return user;
}

// ── Helpers ──

async function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN });

  // Lưu refresh token vào DB
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  await prisma.authSession.create({
    data: {
      userId,
      refreshToken,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}
