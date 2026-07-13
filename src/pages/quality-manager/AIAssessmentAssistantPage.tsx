import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { AIChecklistGenerator } from '@/components/ai/AIChecklistGenerator';

export const AIAssessmentAssistantPage = () => (
  <PageWrapper>
    <PageHeader
      title="AI Assessment Assistant"
      description="Generate a compliance assessment checklist for any standard."
    />
    <AIChecklistGenerator />
  </PageWrapper>
);
