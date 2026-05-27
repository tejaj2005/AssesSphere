import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Mail, User as UserIcon, Building, Shield, Save, Lock, Phone, MapPin, Upload as UploadIcon } from 'lucide-react';
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
    phone: '+91 98765 43210',
    address: 'Bangalore, Karnataka, India',
    bio: 'Quality assurance professional with 8+ years of experience in precision engineering and ISO compliance.',
  });
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [pwdErr, setPwdErr] = useState<Record<string, string>>({});
  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    desktopNotifications: false,
    weeklyDigest: true,
  });

  const saveProfile = () => {
    if (!profile.name.trim()) { toast.error('Name is required'); return; }
    if (!isValidEmail(profile.email)) { toast.error('Invalid email'); return; }
    updateProfile({ name: profile.name, email: profile.email });
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
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (f.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
    toast.success(`Avatar "${f.name}" uploaded`);
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
                  <Avatar name={user?.name || 'U'} size="lg" className="!h-24 !w-24 !text-3xl mx-auto" />
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
                  <div className="flex items-center gap-2 text-muted-foreground"><Building className="h-4 w-4" /> Engineering Department</div>
                  <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /> {user?.email}</div>
                  <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> Bangalore, India</div>
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
          <Card className="p-6 max-w-2xl">
            <h3 className="font-semibold text-lg mb-1">Change Password</h3>
            <p className="text-sm text-muted-foreground mb-6">Use a strong password you don't use elsewhere.</p>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Current Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" value={pwd.current} error={!!pwdErr.current} onChange={(e) => { setPwd({ ...pwd, current: e.target.value }); setPwdErr({ ...pwdErr, current: '' }); }} className="pl-9" />
                </div>
                {pwdErr.current && <p className="text-xs text-destructive">{pwdErr.current}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <Input type="password" value={pwd.next} error={!!pwdErr.next} onChange={(e) => { setPwd({ ...pwd, next: e.target.value }); setPwdErr({ ...pwdErr, next: '' }); }} />
                {pwdErr.next && <p className="text-xs text-destructive">{pwdErr.next}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Confirm New Password</Label>
                <Input type="password" value={pwd.confirm} error={!!pwdErr.confirm} onChange={(e) => { setPwd({ ...pwd, confirm: e.target.value }); setPwdErr({ ...pwdErr, confirm: '' }); }} />
                {pwdErr.confirm && <p className="text-xs text-destructive">{pwdErr.confirm}</p>}
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="accent" onClick={changePassword}>Update Password</Button>
              </div>
            </div>
          </Card>
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
