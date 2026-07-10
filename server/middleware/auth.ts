import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'assesssphere_secret_dev_2025';

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
    const decoded = jwt.verify(token, SECRET) as any;
    req.auth = { userId: decoded.userId, role: decoded.role, organization: decoded.organization };
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}
