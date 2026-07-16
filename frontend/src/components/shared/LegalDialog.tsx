import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ShieldCheck, FileText } from 'lucide-react';

export type LegalKind = 'privacy' | 'terms';

interface LegalDialogProps {
  kind: LegalKind | null;
  onOpenChange: (open: boolean) => void;
}

const CONTENT: Record<LegalKind, { title: string; intro: string; Icon: any; sections: { h: string; p: string }[] }> = {
  privacy: {
    title: 'Privacy Policy',
    intro: 'How AssessSphere, operated by QMICS Pvt. Ltd., handles your information.',
    Icon: ShieldCheck,
    sections: [
      { h: 'Data we collect', p: 'Account details (name, email, role), organization profile information, and the quality records you create within the platform.' },
      { h: 'How we use it', p: 'To provide the quality assurance service, authenticate users, maintain audit trails, and improve reliability. We do not sell personal data.' },
      { h: 'Storage & retention', p: 'In this demonstration build, data is stored locally in your browser. In production deployments, data is encrypted at rest and retained per your organization’s policy.' },
      { h: 'Your rights', p: 'You may request access, correction, or deletion of your data at any time by contacting your administrator or QMICS support.' },
    ],
  },
  terms: {
    title: 'Terms of Service',
    intro: 'The terms governing your use of the AssessSphere platform.',
    Icon: FileText,
    sections: [
      { h: 'Acceptable use', p: 'AssessSphere is licensed for authorized quality-assurance workflows. You agree not to misuse the platform or attempt to access data you are not permitted to view.' },
      { h: 'Accounts & access', p: 'You are responsible for safeguarding your credentials and for activity under your account. Role-based access controls govern what each user can see and do.' },
      { h: 'Service availability', p: 'We aim for high availability but provide the service on an “as is” basis. Scheduled maintenance and updates may occasionally interrupt access.' },
      { h: 'Liability', p: 'QMICS Pvt. Ltd. is not liable for indirect or consequential losses arising from use of the platform, to the extent permitted by applicable law.' },
    ],
  },
};

export const LegalDialog = ({ kind, onOpenChange }: LegalDialogProps) => {
  const data = kind ? CONTENT[kind] : null;
  const Icon = data?.Icon;
  return (
    <Dialog open={!!kind} onOpenChange={onOpenChange} className="!max-w-xl">
      {data && (
        <>
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                {Icon && <Icon className="h-5 w-5" />}
              </div>
              <div>
                <DialogTitle>{data.title}</DialogTitle>
                <DialogDescription>{data.intro}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
            {data.sections.map((s) => (
              <div key={s.h}>
                <h4 className="text-sm font-semibold text-foreground mb-1">{s.h}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.p}</p>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2 border-t">Last updated June 2026 · Questions? Email <a href="mailto:support@qmics.com" className="text-accent hover:underline">support@qmics.com</a>.</p>
          </div>
        </>
      )}
    </Dialog>
  );
};
