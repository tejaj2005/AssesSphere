import app from './app';
import { connectDB } from './db';

const PORT = parseInt(process.env.PORT || '3001');

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

