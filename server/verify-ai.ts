import 'dotenv/config';

const BASE = `http://localhost:${process.env.PORT || 3001}/api/ai`;
const results: { feature: string; status: 'PASS'|'FAIL'; ms: number; note: string }[] = [];

async function post(endpoint: string, body: any): Promise<any> {
  const res = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  return res.json();
}

async function get(endpoint: string): Promise<any> {
  const res = await fetch(`${BASE}/${endpoint}`, { signal: AbortSignal.timeout(10000) });
  return res.json();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Gemini's free tier is 5 req/min and occasionally returns transient 503s or times out under load. */
function isTransientAIError(message: string): boolean {
  return /503|429|high demand|quota|rate.?limit|timeout|aborted/i.test(message);
}

function parseRetryDelayMs(message: string): number | null {
  const match = message.match(/retry in ([\d.]+)s/i);
  return match ? Math.ceil(parseFloat(match[1]) * 1000) + 1000 : null;
}

async function t(feature: string, fn: () => Promise<any>, opts: { gemini?: boolean } = {}): Promise<void> {
  if (opts.gemini) await sleep(13000); // stay under the 5 req/min free-tier Gemini quota

  const start = Date.now();
  let lastNote = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await fn();
      const ms = Date.now() - start;
      if (r && r.success !== false && !r.error) {
        results.push({ feature, status: 'PASS', ms, note: 'OK' });
        console.log(`  ✓  ${feature.padEnd(35)} ${ms}ms${attempt > 1 ? ' (after retry)' : ''}`);
        return;
      }
      lastNote = r?.error || JSON.stringify(r).substring(0, 200);
    } catch (err: any) {
      lastNote = err.message;
    }
    if (attempt === 1 && isTransientAIError(lastNote)) {
      const delay = parseRetryDelayMs(lastNote) ?? 15000;
      console.log(`  …  ${feature.padEnd(35)} transient error, retrying in ${Math.round(delay / 1000)}s`);
      await sleep(delay);
    }
  }
  const ms = Date.now() - start;
  results.push({ feature, status: 'FAIL', ms, note: lastNote });
  console.log(`  ✗  ${feature.padEnd(35)} ${ms}ms  — ${lastNote}`);
}

const SAMPLE_INSPECTION = {
  inspectionReportId: `VERIFY-RPT-${Date.now()}`,
  productName: 'GearBox GX-200',
  inspectionType: 'In-Process Inspection',
  stage: 'R3_MANUFACTURING',
  inspectionDate: new Date().toISOString(),
  inspector: 'Verification Test Inspector',
  checklistItems: [
    { parameter: 'Shaft Diameter', specificationValue: '50.00mm', actualValue: '49.85mm', result: 'MARGINAL', observations: 'Slightly below lower tolerance' },
    { parameter: 'Surface Hardness', specificationValue: '60 HRC', actualValue: '55 HRC', result: 'FAIL', observations: 'Below minimum hardness - heat treatment issue suspected' },
    { parameter: 'Visual Inspection', specificationValue: 'No visible defects', actualValue: 'No defects', result: 'PASS' },
    { parameter: 'Surface Roughness', specificationValue: 'Ra 1.6 μm max', actualValue: 'Ra 1.4 μm', result: 'PASS' },
  ],
};

async function main() {
  console.log('\n╔═════════════════════════════════════════╗');
  console.log('║  AssessSphere AI Feature Verification             ║');
  console.log('╚═════════════════════════════════════════╝\n');
  console.log(`  Server: ${BASE}\n`);

  await t('health-check', () => get('health'));

  await t('ai-findings-generator', () => post('findings', SAMPLE_INSPECTION), { gemini: true });

  await t('capa-recommendation-engine', () => post('capa', {
    findingId: `NC-VERIFY-${Date.now()}`,
    severity: 'MAJOR',
    description: 'Surface hardness 55 HRC measured, minimum specification is 60 HRC. Heat treatment process suspected as root cause.',
    affectedParameter: 'Surface Hardness (HRC)',
    productName: 'GearBox GX-200',
    stage: 'R3_MANUFACTURING',
    frequency: 3,
  }), { gemini: true });

  await t('ai-compliance-copilot', async () => {
    const res = await fetch(`${BASE}/copilot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello, what can you help me with?' }], context: { userRole: 'QualityManager', pendingApprovals: 5, openFindings: 12 } }),
      signal: AbortSignal.timeout(15000),
    });
    return { success: res.status === 200 || (res.headers.get('content-type')?.includes('text/event-stream') ?? false) };
  });

  await t('risk-scoring-formula', () => post('risk-score', {
    entityType: 'SUPPLIER', entityId: `VERIFY-SUP-${Date.now()}`, entityName: 'Verification Supplier Ltd',
    totalInspections: 50, failedInspections: 8, criticalFindings: 2, majorFindings: 5, minorFindings: 12,
    capaOpenCount: 7, capaOverdueCount: 3, complianceScore: 78, withNarrative: false,
  }));

  await t('risk-scoring-ai-narrative', () => post('risk-score', {
    entityType: 'PRODUCT', entityId: `VERIFY-PRD-${Date.now()}`, entityName: 'GearBox GX-200',
    totalInspections: 30, failedInspections: 4, criticalFindings: 1, majorFindings: 3, minorFindings: 8,
    capaOpenCount: 4, capaOverdueCount: 1, complianceScore: 84, withNarrative: true,
  }), { gemini: true });

  await t('quality-scoring-formula', () => post('quality-score', {
    assessmentId: `VERIFY-ASSESS-${Date.now()}`,
    totalQuestions: 40, answeredQuestions: 37, evidenceCount: 15, findingsCount: 5,
    capaCount: 4, checklistCompletionRate: 92.5, withNarrative: false,
  }));

  await t('smart-scheduling', () => post('scheduling', {
    availableInspectors: 3,
    planningHorizonDays: 30,
    entities: [
      { id: 'E1', name: 'SteelTech Metals', type: 'SUPPLIER', lastInspectionDate: '2026-04-01', riskScore: 72, overdueCAPAs: 2 },
      { id: 'E2', name: 'GearBox Line A',   type: 'PRODUCT',  lastInspectionDate: '2026-05-15', riskScore: 85, overdueCAPAs: 4 },
      { id: 'E3', name: 'Assembly Zone 3',  type: 'PROCESS',  lastInspectionDate: '2026-06-01', riskScore: 35, overdueCAPAs: 0 },
    ],
  }));

  await t('generative-reports', () => post('report', {
    reportType: 'EXECUTIVE_SUMMARY',
    period: { from: '2026-01-01', to: '2026-06-30' },
    organization: 'QMICS Solutions Manufacturing',
    kpis: { totalInspections: 248, approvalRate: 94, openFindings: 12, criticalFindings: 2, supplierCount: 18, avgRiskScore: 42 },
  }), { gemini: true });

  await t('predictive-maturity-model', () => post('maturity', {
    organizationId: `VERIFY-ORG-${Date.now()}`,
    totalInspections: 180, averageComplianceScore: 87,
    capaClosureRate: 82, documentedProcesses: 24, auditFrequency: 'Quarterly',
  }), { gemini: true });

  await t('predictive-compliance', () => post('predict', {
    entityId: `VERIFY-ENT-${Date.now()}`,
    entityType: 'DEPARTMENT', entityName: 'Quality Control Department',
    currentRiskScore: 58,
    historicalTrend: [
      { period: 'Q1 2026', score: 45, findings: 8 },
      { period: 'Q2 2026', score: 52, findings: 11 },
      { period: 'Q3 2026', score: 58, findings: 14 },
    ],
  }), { gemini: true });

  await t('benchmarking-intelligence', () => post('benchmark', {
    entityType: 'SUPPLIER',
    entities: [
      { id: 'B1', name: 'Alpha Supplier', type: 'SUPPLIER', complianceScore: 92, totalInspections: 45, failureRate: 0.04, capaClosureRate: 95, avgFindingsPerInspection: 0.8 },
      { id: 'B2', name: 'Beta Supplier',  type: 'SUPPLIER', complianceScore: 78, totalInspections: 32, failureRate: 0.12, capaClosureRate: 76, avgFindingsPerInspection: 2.1 },
      { id: 'B3', name: 'Gamma Supplier', type: 'SUPPLIER', complianceScore: 65, totalInspections: 28, failureRate: 0.21, capaClosureRate: 62, avgFindingsPerInspection: 3.4 },
    ],
  }), { gemini: true });

  await t('executive-ai-dashboard', () => post('executive-summary', {
    organizationId: `VERIFY-EXEC-${Date.now()}`,
    period: 'H1 2026',
    totalInspections: 248, approvalRate: 94,
    openFindings: 12, criticalFindings: 2, supplierCount: 18, avgRiskScore: 42,
  }), { gemini: true });

  await t('assessment-assistant', () => post('checklist', {
    standard: 'ISO_9001_2015',
    productType: 'Mechanical Components',
    processType: 'CNC Manufacturing',
  }), { gemini: true });

  await t('audit-log-retrieval', () => get('audit-log?limit=5'));

  await t('ai-usage-stats', () => get('stats'));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log('\n╔═════════════════════════════════════════╗');
  console.log(`║  Results: ${passed}/${results.length} features passing                    ║`);
  console.log('╚═════════════════════════════════════════╝');

  if (failed > 0) {
    console.log('\n  FAILURES TO FIX:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`    ✗ ${r.feature}`);
      console.log(`      ${r.note}`);
    });
    console.log('\n  DIAGNOSIS GUIDE:');
    console.log('    - "fetch failed" or timeout: Is the server running? npm run server:dev');
    console.log('    - Gemini error (400/429): Check GEMINI_API_KEY in .env, and GEMINI_MODEL=gemini-flash-latest');
    console.log('    - Groq error: Check GROQ_API_KEY in .env, verify at console.groq.com');
    console.log('    - MongoDB error: Check MONGODB_URI, ensure Atlas IP whitelist includes your IP');
    console.log('    - JSON parse error: Gemini returned non-JSON — check thinkingBudget:0 is set in gemini.ts');
    console.log('    - "Cannot find module": Run npm install again');
    process.exitCode = 1;
  } else {
    console.log('\n  ✓ All AI features are working correctly!\n');
  }
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
