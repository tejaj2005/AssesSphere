import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { connectDB } from './db';
import apiRoutes from './routes/index';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

app.use(cors({ origin: process.env.VITE_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(process.cwd(), 'server', 'uploads')));
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
