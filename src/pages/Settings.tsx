import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Monitor, Globe, Bell, Download, Trash2, Shield, Database, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useTheme } from '@/context/ThemeContext';
import { useData } from '@/context/DataContext';
import { downloadJSON } from '@/lib/exporters';
import { cn } from '@/lib/utils';

export const SettingsPage = () => {
  const { themeSetting, setThemeSetting } = useTheme();
  const data = useData();
  const [language, setLanguage] = useState('en-IN');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [density, setDensity] = useState('comfortable');
  const [confirmReset, setConfirmReset] = useState(false);

  const exportEverything = () => {
    downloadJSON('pqas-full-export', {
      organization: data.organization,
      departments: data.departments,
      users: data.users,
      roles: data.roles,
      products: data.products,
      components: data.components,
      manufacturingStages: data.manufacturingStages,
      assemblingStages: data.assemblingStages,
      inspectionTypes: data.inspectionTypes,
      equipment: data.equipment,
      inspectionMethods: data.inspectionMethods,
      documents: data.documents,
      materials: data.materials,
      materialTypes: data.materialTypes,
      suppliers: data.suppliers,
      evalMethods: data.evalMethods,
      auditLog: data.auditLog,
      exportedAt: new Date().toISOString(),
    });
    toast.success('System data exported');
  };

  const clearLocal = () => {
    localStorage.clear();
    toast.success('Local data cleared. Please refresh.');
    setConfirmReset(false);
  };

  const ThemeBtn = ({ value, label, icon: Icon }: any) => {
    const active = themeSetting === value;
    return (
      <motion.button
        whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
        onClick={() => { setThemeSetting(value); toast.success(`Theme set to ${label}`); }}
        className={cn(
          'flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors',
          active ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/40'
        )}
      >
        <Icon className={cn('h-5 w-5', active ? 'text-accent' : 'text-muted-foreground')} />
        <span className={cn('text-sm font-medium', active ? 'text-accent' : '')}>{label}</span>
      </motion.button>
    );
  };

  return (
    <PageWrapper>
      <PageHeader title="Settings" description="Configure your preferences, appearance and system options." />

      <Tabs defaultValue="appearance">
        <TabsList>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="regional">Regional</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="data">Data & Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance">
          <Card className="p-6 max-w-2xl">
            <h3 className="font-semibold text-lg mb-1 flex items-center gap-2"><Palette className="h-4 w-4" /> Theme</h3>
            <p className="text-sm text-muted-foreground mb-4">Choose how PQAS looks to you.</p>
            <div className="flex gap-3">
              <ThemeBtn value="light" label="Light" icon={Sun} />
              <ThemeBtn value="dark" label="Dark" icon={Moon} />
              <ThemeBtn value="system" label="System" icon={Monitor} />
            </div>
            <div className="mt-8 pt-6 border-t">
              <h3 className="font-semibold mb-2">Display Density</h3>
              <Select value={density} onChange={(v) => { setDensity(v); toast.success('Density updated'); }} options={[
                { label: 'Comfortable', value: 'comfortable' },
                { label: 'Compact', value: 'compact' },
                { label: 'Cozy', value: 'cozy' },
              ]} className="max-w-xs" />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="regional">
          <Card className="p-6 max-w-2xl space-y-5">
            <div>
              <Label className="flex items-center gap-2 mb-2"><Globe className="h-4 w-4" /> Language</Label>
              <Select value={language} onChange={setLanguage} options={[
                { label: 'English (India)', value: 'en-IN' },
                { label: 'English (US)', value: 'en-US' },
                { label: 'Hindi', value: 'hi' },
                { label: 'Tamil', value: 'ta' },
                { label: 'Spanish', value: 'es' },
                { label: 'German', value: 'de' },
              ]} className="max-w-xs" />
            </div>
            <div>
              <Label className="mb-2">Timezone</Label>
              <Select value={timezone} onChange={setTimezone} options={[
                { label: 'Asia/Kolkata (IST)', value: 'Asia/Kolkata' },
                { label: 'UTC', value: 'UTC' },
                { label: 'America/New_York', value: 'America/New_York' },
                { label: 'Europe/London', value: 'Europe/London' },
                { label: 'Asia/Singapore', value: 'Asia/Singapore' },
              ]} className="max-w-xs" />
            </div>
            <div>
              <Label className="mb-2">Date format</Label>
              <Select value="dmy" onChange={() => toast.success('Format updated')} options={[
                { label: 'DD/MM/YYYY', value: 'dmy' },
                { label: 'MM/DD/YYYY', value: 'mdy' },
                { label: 'YYYY-MM-DD', value: 'iso' },
              ]} className="max-w-xs" />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="p-6 max-w-2xl">
            <h3 className="font-semibold text-lg mb-1 flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications</h3>
            <p className="text-sm text-muted-foreground mb-6">Choose which events you'd like to be notified about.</p>
            <div className="space-y-3">
              {[
                'New user account created',
                'Equipment calibration due soon',
                'Material stock low',
                'Supplier evaluation overdue',
                'Document version updated',
                'Daily digest summary',
              ].map((label, i) => (
                <motion.div key={label} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center justify-between p-3 rounded-lg border hover:border-accent/40">
                  <span className="text-sm">{label}</span>
                  <Switch checked={i % 2 === 0} onCheckedChange={() => toast.success('Updated')} />
                </motion.div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl">
            <Card className="p-6">
              <h3 className="font-semibold mb-1 flex items-center gap-2"><Download className="h-4 w-4" /> Export Data</h3>
              <p className="text-sm text-muted-foreground mb-4">Download all your PQAS data as a JSON file.</p>
              <Button variant="outline" className="w-full" onClick={exportEverything}>
                <Download className="h-4 w-4" /> Export full system
              </Button>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-1 flex items-center gap-2"><Database className="h-4 w-4" /> Storage</h3>
              <p className="text-sm text-muted-foreground mb-4">Local storage used by this session.</p>
              <div className="flex items-center justify-between text-sm">
                <span>Used</span>
                <span className="font-medium">~ 12 KB / 5 MB</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full w-[3%] bg-accent rounded-full" />
              </div>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-1 flex items-center gap-2"><Shield className="h-4 w-4" /> Sessions</h3>
              <p className="text-sm text-muted-foreground mb-4">Active sessions across devices.</p>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">This device</p>
                  <p className="text-xs text-muted-foreground">Active now</p>
                </div>
                <Button variant="outline" size="sm" disabled>Current</Button>
              </div>
            </Card>
            <Card className="p-6 border-destructive/30">
              <h3 className="font-semibold mb-1 text-destructive flex items-center gap-2"><Trash2 className="h-4 w-4" /> Danger Zone</h3>
              <p className="text-sm text-muted-foreground mb-4">Clear all locally stored preferences. You will need to log in again.</p>
              <Button variant="destructive" className="w-full" onClick={() => setConfirmReset(true)}>
                <Trash2 className="h-4 w-4" /> Clear local data
              </Button>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Clear local data?"
        description="This will sign you out and reset preferences. Mock data will be reloaded fresh."
        onConfirm={clearLocal}
        confirmLabel="Clear & sign out"
      />
    </PageWrapper>
  );
};
