import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Mail, Lock, Sun, Moon, ChevronDown, Shield, Eye as EyeIcon, Clipboard, Warehouse, Award, HardHat } from 'lucide-react';
import { AssessSphereLogo, AssessSphereLogoWhite } from '@/components/AssessSphereLogo';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LegalDialog, LegalKind } from '@/components/shared/LegalDialog';
import { useAuth, MOCK_ACCOUNTS } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { isValidEmail, cn } from '@/lib/utils';

const ROLE_ICONS: Record<string, any> = {
  Admin: Shield,
  Management: EyeIcon,
  'Production Manager': Clipboard,
  'Stores Manager': Warehouse,
  'Quality Manager': Award,
  Inspector: HardHat,
};

export const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('priya@pqas.com');
  const [password, setPassword] = useState('admin123');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showAccounts, setShowAccounts] = useState(false);
  const [legal, setLegal] = useState<LegalKind | null>(null);

  if (isAuthenticated) return <Navigate to="/app" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!email) errs.email = 'Email is required';
    else if (!isValidEmail(email)) errs.email = 'Invalid email format';
    if (!password) errs.password = 'Password is required';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const res = await login(email, password);
    setBusy(false);
    if (!res.success) { toast.error(res.error || 'Login failed'); return; }
    toast.success('Welcome back!');
    navigate('/app');
  };

  const selectRole = async (acc: typeof MOCK_ACCOUNTS[0]) => {
    setEmail(acc.email); setPassword(acc.password); setShowAccounts(false);
    setBusy(true);
    toast.message(`Signing in as ${acc.role}…`);
    const res = await login(acc.email, acc.password);
    setBusy(false);
    if (!res.success) { toast.error(res.error || 'Login failed'); return; }
    toast.success(`Welcome, ${acc.name}`);
    navigate('/app');
  };

  return (
    <div className="min-h-screen flex bg-background">
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-2 rounded-md border bg-card hover:bg-muted transition-colors shadow-sm"
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-slate-950 via-slate-900 to-blue-900 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 60% 80%, white 1px, transparent 1px)', backgroundSize: '60px 60px, 90px 90px' }} />
        <div className="absolute inset-0 gradient-mesh" />
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
          className="relative z-10 flex flex-col justify-between p-12 text-white w-full"
        >
          <div className="flex items-center gap-3">
            <motion.div whileHover={{ scale: 1.05 }}>
              <AssessSphereLogoWhite size={64} />
            </motion.div>
            <div>
              <p className="text-3xl font-extrabold italic tracking-tight">
                <span className="text-white">Assess</span><span className="text-[#f5af12]">Sphere</span>
              </p>
              <p className="text-[11px] text-white/60 tracking-[0.05em] font-medium mt-1">Quality Assessment System · Powered by QMICS</p>
            </div>
          </div>
          <div className="space-y-6">
            <h1 className="text-4xl xl:text-5xl font-bold leading-[1.1] max-w-md tracking-tight">Manufacturing quality, perfected.</h1>
            <p className="text-white/70 text-base max-w-md leading-relaxed">An enterprise-grade Product Quality Assurance System. Configure organization, inspections, and suppliers from a unified admin console.</p>
            <div className="flex flex-wrap gap-2 pt-2">
              {['SOC 2 Type II', 'ISO 27001', 'GDPR Ready', '99.9% Uptime'].map((b) => (
                <div key={b} className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur text-xs font-medium border border-white/10">{b}</div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-white/40">
            <p>&copy; 2026 PQAS. All rights reserved.</p>
            <div className="flex gap-4">
              <button onClick={() => setLegal('privacy')} className="hover:text-white/60 transition-colors">Privacy</button>
              <button onClick={() => setLegal('terms')} className="hover:text-white/60 transition-colors">Terms</button>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <AssessSphereLogo size={48} showText showPoweredBy />
          </div>

          <Card className="p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-tight">Sign in to your account</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">Welcome back. Enter your credentials below.</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input id="email" type="email" value={email} error={!!errors.email}
                    onChange={(e) => { setEmail(e.target.value); setErrors((er) => ({ ...er, email: undefined })); }}
                    placeholder="you@example.com" className="pl-9" autoComplete="email" />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" onClick={(e) => { e.preventDefault(); toast.message('Contact your administrator to reset password'); }} className="text-xs text-accent hover:underline">Forgot password?</a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input id="password" type={show ? 'text' : 'password'} value={password} error={!!errors.password}
                    onChange={(e) => { setPassword(e.target.value); setErrors((er) => ({ ...er, password: undefined })); }}
                    placeholder="••••••••" className="pl-9 pr-10" autoComplete="current-password" />
                  <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-muted-foreground hover:text-foreground">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              <Button type="submit" variant="accent" className="w-full" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Quick role sign-in</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {MOCK_ACCOUNTS.filter((a) => a.id !== 'U-DEMO').map((acc) => {
                const Icon = ROLE_ICONS[acc.role] || Shield;
                return (
                  <motion.button key={acc.id} type="button" disabled={busy} onClick={() => selectRole(acc)}
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg border hover:border-accent hover:bg-accent/5 transition-colors text-left disabled:opacity-50">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{acc.role}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{acc.name}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <p className="mt-6 text-center text-[11px] text-muted-foreground">
              By signing in you agree to our <button type="button" onClick={() => setLegal('terms')} className="text-accent hover:underline">Terms</button> and <button type="button" onClick={() => setLegal('privacy')} className="text-accent hover:underline">Privacy</button>.
            </p>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            New to PQAS? <Link to="/" className="text-accent hover:underline">Back to home</Link>
          </p>
        </motion.div>
      </div>

      <LegalDialog kind={legal} onOpenChange={(o) => !o && setLegal(null)} />
    </div>
  );
};
