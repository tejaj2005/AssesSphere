import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './db';
import apiRoutes from './routes/index';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// A wildcard CORS origin ('*') would let any website's script read API responses on behalf of
// a logged-in user's browser. Restrict to an explicit allowlist instead — defaults cover the
// Vite dev server; set ALLOWED_ORIGINS (comma-separated) in .env for any deployed frontend URL.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
// CSP is left to the frontend's own hosting (it's a separate SPA origin); disabling it here
// only turns off the header this API server would otherwise send for its own JSON responses.
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Uploaded documents and calibration certificates are served through their own authenticated,
// organization-scoped routes (GET /api/documents/:id/file and
// GET /api/admin/calibration-records/:id/certificate) instead of a static mount here — a plain
// express.static on /uploads would let anyone with a guessed URL download any org's files with
// no login at all.
app.use('/api', apiRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[Server] AssessSphere AI backend running on http://localhost:${PORT}`);
    console.log(`[Server] Gemini: ${process.env.GEMINI_API_KEY ? 'configured' : 'MISSING'}`);
    console.log(`[Server] Groq:   ${process.env.GROQ_API_KEY ? 'configured' : 'MISSING'}`);
    console.log(`[Server] MongoDB: ${process.env.MONGODB_URI ? 'configured' : 'MISSING'}`);
  });
}

start().catch(console.error);
