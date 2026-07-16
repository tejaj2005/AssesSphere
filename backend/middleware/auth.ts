import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwtSecret';

export interface AuthClaims {
  userId: string;
  role: string;
  organization: string;
}

export interface AuthedRequest extends Request {
  auth?: AuthClaims;
}

/** Verifies the Bearer JWT and attaches the decoded claims to req.auth. Rejects with 401 otherwise. */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ success: false, error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.auth = { userId: decoded.userId, role: decoded.role, organization: decoded.organization };
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

// Every route so far only checked "is this a valid token" — never "is this token's role actually
// allowed to be here." The frontend hides pages by role (ProtectedRoute allowedRoles in
// src/App.tsx), but that's a UI convenience, not a security boundary: any authenticated user of
// any role could call e.g. POST /api/admin/users directly and it would succeed. Mount this after
// requireAuth on routes where only specific roles should be able to act.
export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ success: false, error: 'You do not have permission to perform this action' });
    }
    next();
  };
}
