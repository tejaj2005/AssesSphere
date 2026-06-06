import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Mail, User as UserIcon, Building, Shield, Save, Lock, Phone, MapPin, Upload as UploadIcon, Eye, EyeOff, ShieldCheck, Smartphone, Check, Monitor, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { isValidEmail } from '@/lib/utils';

export const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    bio: user?.bio || '',
  });
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [pwdErr, setPwdErr] = useState<Record<string, string>>({});
  const [showPwd, setShowPwd] = useState(false);
  const [pwdSaved, setPwdSaved] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    desktopNotifications: false,
    weeklyDigest: true,
  });

  // Lightweight client-side password strength estimate (0–4) for the animated meter.
  const pwdStrength = (() => {
    const p = pwd.next;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
    return score;
  })();
  const STRENGTH = [
    { label: 'Too short', color: 'bg-destructive', text: 'text-destructive' },
    { label: 'Weak', color: 'bg-destructive', text: 'text-destructive' },
    { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-500' },
    { label: 'Good', color: 'bg-blue-500', text: 'text-blue-500' },
    { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-500' },
  ];

  const saveProfile = () => {
    if (!profile.name.trim()) { toast.error('Name is required'); return; }
    if (!isValidEmail(profile.email)) { toast.error('Invalid email'); return; }
    updateProfile({ name: profile.name, email: profile.email, phone: profile.phone, address: profile.address, bio: profile.bio });
    toast.success('Profile updated');
  };

  const changePassword = () => {
    const e: Record<string, string> = {};
    if (!pwd.current) e.current = 'Required';
    if (!pwd.next) e.next = 'Required';
    else if (pwd.next.length < 6) e.next = 'Min 6 characters';
    if (pwd.next !== pwd.confirm) e.confirm = "Passwords don't match";
    setPwdErr(e);
    if (Object.keys(e).length) return;
    toast.success('Password updated successfully');
    setPwd({ current: '', next: '', confirm: '' });
    setPwdSaved(true);
    setTimeout(() => setPwdSaved(false), 2600);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (f.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateProfile({ avatar: reader.result });
        toast.success('Profile photo updated');
      }
    };
    reader.onerror = () => toast.error('Could not read image');
    reader.readAsDataURL(f);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <PageWrapper>
      <PageHeader title="Profile Settings" description="Manage your personal information and account preferences." />

      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-6 lg:col-span-1">
              <div className="text-center">
                <div className="relative inline-block">
                  <Avatar name={user?.name || 'U'} src={user?.avatar} size="lg" className="!h-24 !w-24 !text-3xl mx-auto" />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md hover:scale-110 transition-transform"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>
                <h2 className="mt-4 text-lg font-semibold">{user?.name}</h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <Badge variant="accent" className="mt-3"><Shield className="h-3 w-3 mr-1" />{user?.role}</Badge>
                <div className="mt-6 pt-6 border-t space-y-3 text-left text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><Building className="h-4 w-4 shrink-0" /> Engineering Department</div>
                  <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4 shrink-0" /> <span className="truncate">{user?.email}</span></div>
                  {profile.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4 shrink-0" /> {profile.phone}</div>}
                  <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" /> {profile.address || 'No address set'}</div>
                </div>
                <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => fileRef.current?.click()}>
                  <UploadIcon className="h-4 w-4" /> Upload Photo
                </Button>
              </div>
            </Card>

            <Card className="p-6 lg:col-span-2">
              <h3 className="font-semibold text-lg mb-1">Personal Information</h3>
              <p className="text-sm text-muted-foreground mb-6">Update your personal details and contact information.</p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Full Name</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} className="pl-9" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Bio</Label>
                  <Textarea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={3} />
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="accent" onClick={saveProfile}><Save className="h-4 w-4" /> Save Changes</Button>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="p-6 h-full">
                <div className="flex items-center gap-2 mb-1">
                  <KeyRound className="h-4 w-4 text-accent" />
                  <h3 className="font-semibold text-lg">Change Password</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-6">Use a strong password you don't use elsewhere.</p>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Current Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type={showPwd ? 'text' : 'password'} value={pwd.current} error={!!pwdErr.current} onChange={(e) => { setPwd({ ...pwd, current: e.target.value }); setPwdErr({ ...pwdErr, current: '' }); }} className="pl-9 pr-10" />
                      <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showPwd ? 'Hide passwords' : 'Show passwords'}>
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {pwdErr.current && <motion.p initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="text-xs text-destructive">{pwdErr.current}</motion.p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type={showPwd ? 'text' : 'password'} value={pwd.next} error={!!pwdErr.next} onChange={(e) => { setPwd({ ...pwd, next: e.target.value }); setPwdErr({ ...pwdErr, next: '' }); }} className="pl-9" />
                    </div>
                    <AnimatePresence>
                      {pwd.next && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="flex items-center gap-1.5 pt-1.5">
                            {[0, 1, 2, 3].map((i) => (
                              <div key={i} className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: i < pwdStrength ? '100%' : 0 }}
                                  transition={{ duration: 0.3 }}
                                  className={`h-full ${STRENGTH[pwdStrength].color}`}
                                />
                              </div>
                            ))}
                          </div>
                          <p className={`text-[11px] mt-1 font-medium ${STRENGTH[pwdStrength].text}`}>{STRENGTH[pwdStrength].label} password</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {pwdErr.next && <motion.p initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="text-xs text-destructive">{pwdErr.next}</motion.p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type={showPwd ? 'text' : 'password'} value={pwd.confirm} error={!!pwdErr.confirm} onChange={(e) => { setPwd({ ...pwd, confirm: e.target.value }); setPwdErr({ ...pwdErr, confirm: '' }); }} className="pl-9" />
                      {pwd.confirm && pwd.confirm === pwd.next && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500"><Check className="h-4 w-4" /></motion.span>
                      )}
                    </div>
                    {pwdErr.confirm && <motion.p initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="text-xs text-destructive">{pwdErr.confirm}</motion.p>}
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <AnimatePresence>
                      {pwdSaved && (
                        <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-500">
                          <Check className="h-4 w-4" /> Updated
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <Button variant="accent" onClick={changePassword}>Update Password</Button>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 }} className="space-y-4">
              <Card className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0"><Smartphone className="h-5 w-5" /></div>
                    <div>
                      <h3 className="font-semibold">Two-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Add an extra layer of security to your account.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setTwoFA((v) => !v); toast.success(twoFA ? 'Two-factor disabled' : 'Two-factor enabled'); }}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${twoFA ? 'bg-accent' : 'bg-input'}`}
                  >
                    <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={`inline-block h-5 w-5 rounded-full bg-white shadow transform ${twoFA ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <AnimatePresence>
                  {twoFA && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-sm text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="h-4 w-4 shrink-0" /> Authenticator app protection is active.
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4">Active Sessions</h3>
                <div className="space-y-2">
                  {[
                    { device: 'Chrome · Windows', loc: 'Bangalore, IN', current: true },
                    { device: 'Safari · iPhone', loc: 'Bangalore, IN', current: false },
                  ].map((s, i) => (
                    <motion.div key={s.device} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08 }} whileHover={{ x: 2 }}
                      className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{s.device}</p>
                          <p className="text-xs text-muted-foreground">{s.loc}</p>
                        </div>
                      </div>
                      {s.current
                        ? <Badge variant="success" className="text-[10px]">This device</Badge>
                        : <button onClick={() => toast.success('Session revoked')} className="text-xs text-destructive hover:underline">Revoke</button>}
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="preferences">
          <Card className="p-6 max-w-2xl">
            <h3 className="font-semibold text-lg mb-1">Notification Preferences</h3>
            <p className="text-sm text-muted-foreground mb-6">Choose how you'd like to be notified.</p>
            <div className="space-y-4">
              {([
                ['emailNotifications', 'Email Notifications', 'Receive updates via email'],
                ['desktopNotifications', 'Desktop Notifications', 'Show browser notifications'],
                ['weeklyDigest', 'Weekly Digest', 'Summary email every Monday'],
              ] as const).map(([key, label, desc]) => (
                <motion.div key={key} whileHover={{ x: 2 }} className="flex items-center justify-between p-3 rounded-lg border hover:border-accent/40 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <button
                    onClick={() => { setPrefs({ ...prefs, [key]: !prefs[key] }); toast.success('Preference updated'); }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prefs[key] ? 'bg-accent' : 'bg-input'}`}
                  >
                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${prefs[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </motion.div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
};
