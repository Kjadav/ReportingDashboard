import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../../lib/auth';
import prisma from '../../lib/prisma';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        organizationId?: string;
        role?: string;
      };
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Verify token
    const payload = await verifyToken(token);

    if (!payload || payload.type !== 'access') {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Attach user to request
    req.user = {
      id: payload.sub,
      email: payload.email,
      organizationId: payload.orgId,
      role: payload.role,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware to check if user is admin
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}

/**
 * Middleware to require organization context
 */
export async function requireOrganization(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Get organization from header, query, or user's default
  const orgId =
    (req.headers['x-organization-id'] as string) ||
    (req.query.organizationId as string) ||
    req.user.organizationId;

  if (!orgId) {
    res.status(400).json({ error: 'Organization context required' });
    return;
  }

  // Verify user has access to this organization
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: req.user.id,
        organizationId: orgId,
      },
    },
  });

  if (!membership) {
    res.status(403).json({ error: 'Access denied to this organization' });
    return;
  }

  // Update request with organization context
  req.user.organizationId = orgId;
  req.user.role = membership.role;

  next();
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const payload = await verifyToken(token);
      if (payload && payload.type === 'access') {
        req.user = {
          id: payload.sub,
          email: payload.email,
          organizationId: payload.orgId,
          role: payload.role,
        };
      }
    }

    next();
  } catch {
    // Ignore errors for optional auth
    next();
  }
}

