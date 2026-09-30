import jwt, { SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';

export interface AccessTokenPayload {
  userId: string;
}

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

// refresh tokens are signed JWTs but we ALSO store a hash of them in the db (RefreshToken table)
// so we can revoke/rotate - a valid signature alone isn't enough, it also has to match an
// unrevoked row in the db. that's what lets us detect reuse of an already-rotated token.
// jwtid makes every token unique: without it, two tokens signed in the same second are
// byte-identical, so a "rotated" token could equal the one it replaced.
export function signRefreshToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, REFRESH_SECRET, {
    jwtid: randomUUID(),
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  });
}

export function verifyRefreshToken(token: string): AccessTokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as AccessTokenPayload;
}
