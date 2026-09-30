import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { hashPassword, comparePassword } from '../../utils/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt';
import { AppError } from '../../middleware/errorHandler';

// we store a sha256 hash of the refresh token, not the token itself - same reasoning as
// passwords, a leaked db shouldn't hand out working sessions
function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function signup(email: string, password: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, 'an account with this email already exists');
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  return issueTokens(user.id);
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(401, 'invalid email or password');
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'invalid email or password');
  }

  return issueTokens(user.id);
}

async function issueTokens(userId: string) {
  const accessToken = signAccessToken({ userId });
  const refreshToken = signRefreshToken({ userId });

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken };
}

// rotation: every refresh call revokes the old token and issues a brand new one.
// if someone presents a token that's already been revoked, that means either it was
// already used once (normal rotation already happened) or it's stolen - either way we
// revoke ALL of that user's refresh tokens, forcing a re-login everywhere.
export async function refresh(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, 'invalid refresh token');
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findFirst({
    where: { userId: payload.userId, tokenHash },
  });

  if (!stored) {
    throw new AppError(401, 'refresh token not recognized');
  }

  if (stored.revokedAt) {
    // reuse of a rotated-out token - treat as compromised
    await prisma.refreshToken.updateMany({
      where: { userId: payload.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new AppError(401, 'refresh token reuse detected, all sessions revoked');
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return issueTokens(payload.userId);
}

export async function logout(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
