import { Router, Request, Response, NextFunction } from 'express';
import { AuthedRequest } from '../../middleware/auth';
import multer from 'multer';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { generateFindings } from '../features/findings';
import { generateCapa } from '../features/capa';
import { performGapAnalysis } from '../features/gap-analysis';
import { validateEvidence } from '../features/evidence';
import { analyzeDocument } from '../features/document-intel';
import { streamCopilotResponse } from '../features/copilot';
import { generateRiskScore } from '../features/risk-score';
import { scoreAssessmentWithNarrative, calculateQualityScore } from '../features/quality-score';
import { generateSchedule } from '../features/scheduling';
import { generateReport } from '../features/report';
import { assessMaturity } from '../features/maturity';
import { generatePredictions } from '../features/prediction';
import { generateBenchmarkSummary } from '../features/benchmarking';
import { generateExecutiveSummary } from '../features/executive';
import { generateAssessmentChecklist } from '../features/assessment-assist';
import { processUploadedFile, cleanupTempFile } from '../document-processor';
import { AIAuditLog } from '../../models/AIAuditLog';
import { AIFinding } from '../../models/AIFinding';
import { AICapa } from '../../models/AICapa';
import { AIRiskScore } from '../../models/AIRiskScore';
import { AIGapAnalysis } from '../../models/AIGapAnalysis';

const router = Router();

const UPLOAD_DIR = path.join(os.tmpdir(), 'assesssphere-ai-uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: (parseInt(process.env.UPLOAD_MAX_MB || '10')) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc', '.txt', '.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// Rate limiting (in-memory, per-IP, per-minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(maxPerMinute: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = (req.ip || 'unknown') + ':' + maxPerMinute;
    const now = Date.now();
    const entry = rateLimitMap.get(key);
    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + 60000 });
      return next();
    }
    if (entry.count >= maxPerMinute) {
      return res.status(429).json({ success: false, error: 'Rate limit exceeded. Wait 1 minute.' });
    }
    entry.count++;
    next();
  };
}

async function logAI(feature: string, provider: string, success: boolean, durationMs: number, errorMessage?: string) {
  try {
    await AIAuditLog.create({ feature, provider, success, durationMs, errorMessage });
  } catch { /* audit log failure is non-fatal */ }
}

// ── FINDINGS ─────────────────────────────────────────────────────────────────
router.post('/findings', rateLimit(10), async (req: AuthedRequest, res: Response) => {
  const start = Date.now();
  try {
    const organization = req.auth!.organization;
    const result = await generateFindings({ ...req.body, organization });
    await AIFinding.findOneAndUpdate(
      { inspectionReportId: req.body.inspectionReportId, organization },
      { inspectionReportId: req.body.inspectionReportId, organization, findings: result, generatedAt: new Date() },
      { upsert: true }
    );
    await logAI('findings', 'gemini', true, Date.now() - start);
    res.json({ success: true, data: result });
  } catch (error) {
    await logAI('findings', 'gemini', false, Date.now() - start, String(error));
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ── CAPA ──────────────────────────────────────────────────────────────────────
router.post('/capa', rateLimit(10), async (req: AuthedRequest, res: Response) => {
  const start = Date.now();
  try {
    const organization = req.auth!.organization;
    const result = await generateCapa({ ...req.body, organization });
    await AICapa.findOneAndUpdate(
      { findingId: req.body.findingId, organization },
      { findingId: req.body.findingId, organization, recommendation: result, generatedAt: new Date() },
      { upsert: true }
    );
    await logAI('capa', 'gemini', true, Date.now() - start);
    res.json({ success: true, data: result });
  } catch (error) {
    await logAI('capa', 'gemini', false, Date.now() - start, String(error));
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ── COPILOT (Groq streaming) ──────────────────────────────────────────────────
router.post('/copilot', rateLimit(30), async (req: AuthedRequest, res: Response) => {
  const { messages, context } = req.body;
  await streamCopilotResponse(messages || [], context || { userRole: 'User' }, res, req.auth?.userId);
});

// ── GAP ANALYSIS ──────────────────────────────────────────────────────────────
router.post('/gap-analysis', rateLimit(5), upload.single('document'),
  async (req: AuthedRequest, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'Document file required' });
    const start = Date.now();
    try {
      const doc = await processUploadedFile(req.file.path, req.file.originalname);
      const standard = req.body.standard || 'ISO_9001_2015';
      const result = await performGapAnalysis(doc, standard);
      await AIGapAnalysis.create({
        documentName: req.file.originalname,
        organization: req.auth!.organization,
        standard,
        complianceScore: result.overallComplianceScore,
        analysis: result,
      });
      await logAI('gap-analysis', 'gemini', true, Date.now() - start);
      res.json({ success: true, data: result });
    } catch (error) {
      await logAI('gap-analysis', 'gemini', false, Date.now() - start, String(error));
      res.status(500).json({ success: false, error: String(error) });
    } finally {
      if (req.file) cleanupTempFile(req.file.path);
    }
  }
);

// ── EVIDENCE VALIDATION ───────────────────────────────────────────────────────
router.post('/validate-evidence', rateLimit(10), upload.single('evidence'),
  async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'Evidence file required' });
    const start = Date.now();
    try {
      const file = await processUploadedFile(req.file.path, req.file.originalname);
      const result = await validateEvidence(
        file,
        req.body.assessmentQuestion || '',
        req.body.requirement || ''
      );
      await logAI('evidence-validation', 'gemini', true, Date.now() - start);
      res.json({ success: true, data: result });
    } catch (error) {
      await logAI('evidence-validation', 'gemini', false, Date.now() - start, String(error));
      res.status(500).json({ success: false, error: String(error) });
    } finally {
      if (req.file) cleanupTempFile(req.file.path);
    }
  }
);

// ── DOCUMENT INTELLIGENCE ─────────────────────────────────────────────────────
router.post('/document-intel', rateLimit(10), upload.single('document'),
  async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'Document file required' });
    const start = Date.now();
    try {
      const file = await processUploadedFile(req.file.path, req.file.originalname);
      const result = await analyzeDocument(file);
      await logAI('document-intel', 'gemini', true, Date.now() - start);
      res.json({ success: true, data: result });
    } catch (error) {
      await logAI('document-intel', 'gemini', false, Date.now() - start, String(error));
      res.status(500).json({ success: false, error: String(error) });
    } finally {
      if (req.file) cleanupTempFile(req.file.path);
    }
  }
);

// ── RISK SCORING ──────────────────────────────────────────────────────────────
router.post('/risk-score', rateLimit(20), async (req: AuthedRequest, res: Response) => {
  const start = Date.now();
  try {
    const organization = req.auth!.organization;
    const withNarrative = req.body.withNarrative === true;
    const result = await generateRiskScore({ ...req.body, organization }, withNarrative);
    await AIRiskScore.findOneAndUpdate(
      { entityType: req.body.entityType, entityId: req.body.entityId, organization },
      {
        entityType: req.body.entityType,
        entityId: req.body.entityId,
        organization,
        entityName: result.entityName,
        overallScore: result.overallScore,
        riskLevel: result.riskLevel,
        scoreDetails: result,
        calculatedAt: new Date(),
      },
      { upsert: true }
    );
    await logAI('risk-score', withNarrative ? 'gemini' : 'formula', true, Date.now() - start);
    res.json({ success: true, data: result });
  } catch (error) {
    await logAI('risk-score', 'formula', false, Date.now() - start, String(error));
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ── QUALITY SCORE ─────────────────────────────────────────────────────────────
router.post('/quality-score', rateLimit(20), async (req: AuthedRequest, res: Response) => {
  const start = Date.now();
  try {
    const input = { ...req.body, organization: req.auth!.organization };
    const withNarrative = req.body.withNarrative === true;
    const result = withNarrative
      ? await scoreAssessmentWithNarrative(input)
      : calculateQualityScore(input);
    await logAI('quality-score', withNarrative ? 'gemini' : 'formula', true, Date.now() - start);
    res.json({ success: true, data: result });
  } catch (error) {
    await logAI('quality-score', 'formula', false, Date.now() - start, String(error));
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ── SCHEDULING ────────────────────────────────────────────────────────────────
router.post('/scheduling', rateLimit(20), async (req: Request, res: Response) => {
  try {
    const result = generateSchedule(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ── REPORT GENERATION ─────────────────────────────────────────────────────────
router.post('/report', rateLimit(5), async (req: AuthedRequest, res: Response) => {
  const start = Date.now();
  try {
    const result = await generateReport({ ...req.body, organization: req.auth!.organization });
    await logAI('report', 'gemini', true, Date.now() - start);
    res.json({ success: true, data: result });
  } catch (error) {
    await logAI('report', 'gemini', false, Date.now() - start, String(error));
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ── MATURITY MODEL ────────────────────────────────────────────────────────────
router.post('/maturity', rateLimit(10), async (req: AuthedRequest, res: Response) => {
  const start = Date.now();
  try {
    const result = await assessMaturity({ ...req.body, organizationId: req.auth!.organization });
    await logAI('maturity', 'gemini', true, Date.now() - start);
    res.json({ success: true, data: result });
  } catch (error) {
    await logAI('maturity', 'gemini', false, Date.now() - start, String(error));
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ── PREDICTIVE INTELLIGENCE ───────────────────────────────────────────────────
router.post('/predict', rateLimit(10), async (req: AuthedRequest, res: Response) => {
  const start = Date.now();
  try {
    const result = await generatePredictions({ ...req.body, organization: req.auth!.organization });
    await logAI('prediction', 'gemini', true, Date.now() - start);
    res.json({ success: true, data: result });
  } catch (error) {
    await logAI('prediction', 'gemini', false, Date.now() - start, String(error));
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ── BENCHMARKING ──────────────────────────────────────────────────────────────
router.post('/benchmark', rateLimit(10), async (req: AuthedRequest, res: Response) => {
  const start = Date.now();
  try {
    const { entities, entityType } = req.body;
    const result = await generateBenchmarkSummary(entities, entityType, req.auth!.organization);
    await logAI('benchmarking', 'gemini', true, Date.now() - start);
    res.json({ success: true, data: result });
  } catch (error) {
    await logAI('benchmarking', 'gemini', false, Date.now() - start, String(error));
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ── EXECUTIVE DASHBOARD ───────────────────────────────────────────────────────
router.post('/executive-summary', rateLimit(10), async (req: AuthedRequest, res: Response) => {
  const start = Date.now();
  try {
    const result = await generateExecutiveSummary({ ...req.body, organizationId: req.auth!.organization });
    await logAI('executive-summary', 'gemini', true, Date.now() - start);
    res.json({ success: true, data: result });
  } catch (error) {
    await logAI('executive-summary', 'gemini', false, Date.now() - start, String(error));
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ── ASSESSMENT ASSISTANT ──────────────────────────────────────────────────────
router.post('/checklist', rateLimit(10), async (req: AuthedRequest, res: Response) => {
  const start = Date.now();
  try {
    const { standard, productType, processType } = req.body;
    const result = await generateAssessmentChecklist(standard, req.auth!.organization, productType, processType);
    await logAI('assessment-assist', 'gemini', true, Date.now() - start);
    res.json({ success: true, data: result });
  } catch (error) {
    await logAI('assessment-assist', 'gemini', false, Date.now() - start, String(error));
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ── AUDIT LOG (for Admin AI Settings page) ────────────────────────────────────
router.get('/audit-log', async (req: Request, res: Response) => {
  try {
    const filter: Record<string, any> = {};
    if (req.query.feature) filter.feature = String(req.query.feature);
    const logs = await AIAuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ── USAGE STATS ───────────────────────────────────────────────────────────────
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [byFeature, byProvider, overall, recentErrors] = await Promise.all([
      AIAuditLog.aggregate([
        { $group: { _id: '$feature', count: { $sum: 1 }, avgMs: { $avg: '$durationMs' }, successCount: { $sum: { $cond: ['$success', 1, 0] } } } },
        { $sort: { count: -1 } },
      ]),
      AIAuditLog.aggregate([{ $group: { _id: '$provider', count: { $sum: 1 } } }]),
      AIAuditLog.aggregate([{ $group: { _id: null, total: { $sum: 1 }, success: { $sum: { $cond: ['$success', 1, 0] } } } }]),
      AIAuditLog.find({ success: false }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);
    const rate = overall[0];
    res.json({
      success: true,
      data: {
        byFeature,
        byProvider,
        overallSuccessRate: rate ? Math.round((rate.success / rate.total) * 100) : 100,
        recentErrors,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────
router.get('/health', async (_req: Request, res: Response) => {
  const geminiOk = !!process.env.GEMINI_API_KEY;
  const groqOk = !!process.env.GROQ_API_KEY;
  res.json({
    status: 'ok',
    gemini: geminiOk ? 'configured' : 'missing key',
    groq: groqOk ? 'configured' : 'missing key',
    timestamp: new Date().toISOString(),
  });
});

export default router;
