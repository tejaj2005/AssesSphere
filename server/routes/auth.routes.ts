import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Organization } from '../models/Organization';

const router  = Router();
const SECRET  = process.env.JWT_SECRET || 'assesssphere_secret_dev_2025';

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    user.lastLogin = new Date();
    await user.save();
    const token = jwt.sign({ userId: user._id, role: user.role, organization: user.organization }, SECRET, { expiresIn: '8h' });
    res.json({ success: true, data: { token, user } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, organizationName } = req.body;
    let org = await Organization.findOne({ name: organizationName || 'Default' });
    if (!org) org = await Organization.create({ name: organizationName || 'QMICS Manufacturing' });
    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }
    const user = await User.create({ name, email, password, role: role || 'Inspector', organization: org._id });
    const token = jwt.sign({ userId: user._id, role: user.role, organization: user.organization }, SECRET, { expiresIn: '8h' });
    res.status(201).json({ success: true, data: { token, userId: user._id } });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, error: 'No token' });
    const decoded = jwt.verify(token, SECRET) as any;
    const user = await User.findById(decoded.userId).select('-password').populate('organization');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch { res.status(401).json({ success: false, error: 'Invalid token' }); }
});

export default router;
