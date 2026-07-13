import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { JWT_SECRET } from '../config/jwtSecret';

const router = Router();

// Slows down credential-stuffing / brute-force attempts against /login without needing a
// captcha. skipSuccessfulRequests is the important part: only *failed* attempts count toward
// the cap, so a real user (or this app's "quick role sign-in", which fires several correct
// logins back to back when switching demo roles) never gets blocked by their own successful
// logins — only a run of wrong passwords does.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, error: 'Too many failed login attempts. Try again in a few minutes.' },
});

router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    user.lastLogin = new Date();
    await user.save();
    const token = jwt.sign({ userId: user._id, role: user.role, organization: user.organization }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ success: true, data: { token, user } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/register', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, organizationName } = req.body;
    let org = await Organization.findOne({ name: organizationName || 'Default' });
    if (!org) org = await Organization.create({ name: organizationName || 'QMICS Manufacturing' });
    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }
    const user = await User.create({ name, email, password, role: role || 'Inspector', organization: org._id });
    const token = jwt.sign({ userId: user._id, role: user.role, organization: user.organization }, JWT_SECRET, { expiresIn: '8h' });
    res.status(201).json({ success: true, data: { token, userId: user._id } });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, error: 'No token' });
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.userId).select('-password').populate('organization');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch { res.status(401).json({ success: false, error: 'Invalid token' }); }
});

export default router;
