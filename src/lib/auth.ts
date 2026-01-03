import { SignJWT, jwtVerify } from 'jose';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import prisma from './prisma';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'development-secret-change-in-production'
);

const JWT_ISSUER = 'ads-analytics-platform';
const JWT_AUDIENCE = 'ads-analytics-api';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  sub: string; // userId
  email: string;
  orgId?: string;
  role?: string;
  type: 'access' | 'refresh';
}

/**
 * Hash a password using argon2
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Generate an access token
 */
export async function generateAccessToken(payload: Omit<TokenPayload, 'type'>): Promise<string> {
  return new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

/**
 * Generate a refresh token
 */
export async function generateRefreshToken(payload: Omit<TokenPayload, 'type'>): Promise<string> {
  return new SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

/**
 * Verify a JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Generate both access and refresh tokens
 */
export async function generateTokenPair(user: {
  id: string;
  email: string;
  organizationId?: string;
  role?: string;
}): Promise<{ accessToken: string; refreshToken: string }> {
  const payload = {
    sub: user.id,
    email: user.email,
    orgId: user.organizationId,
    role: user.role,
  };

  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(payload),
    generateRefreshToken(payload),
  ]);

  return { accessToken, refreshToken };
}

/**
 * Create a session in the database
 */
export async function createSession(userId: string): Promise<{
  sessionId: string;
  token: string;
  expiresAt: Date;
}> {
  const sessionId = uuidv4();
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.session.create({
    data: {
      id: sessionId,
      userId,
      token,
      expiresAt,
    },
  });

  return { sessionId, token, expiresAt };
}

/**
 * Validate a session token
 */
export async function validateSession(token: string): Promise<{
  userId: string;
  sessionId: string;
} | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    select: { id: true, userId: true, expiresAt: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return { userId: session.userId, sessionId: session.id };
}

/**
 * Delete a session
 */
export async function deleteSession(token: string): Promise<void> {
  await prisma.session.delete({
    where: { token },
  }).catch(() => {
    // Session might not exist, ignore error
  });
}

/**
 * Delete all sessions for a user
 */
export async function deleteAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId },
  });
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}

