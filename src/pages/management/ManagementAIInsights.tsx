import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { AIReportGenerator } from '@/components/ai/AIReportGenerator';
import { AIExecutiveSummaryCard } from '@/components/ai/AIExecutiveSummaryCard';
import { AIMaturityCard } from '@/components/ai/AIMaturityCard';
import { AIPredictionCard } from '@/components/ai/AIPredictionCard';
import { AIBenchmarkPanel } from '@/components/ai/AIBenchmarkPanel';

export const ManagementAIInsights = () => (
  <PageWrapper>
    <PageHeader
      title="AI Insights"
      description="AI-generated organizational insight - maturity, predictive risk, benchmarking and executive summaries."
    />

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <AIReportGenerator />
      <AIExecutiveSummaryCard />
      <AIMaturityCard />
      <AIPredictionCard />
    </div>

    <div className="mt-4">
      <AIBenchmarkPanel />
    </div>
  </PageWrapper>
);
