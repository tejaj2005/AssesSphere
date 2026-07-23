import mongoose from 'mongoose';

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected || mongoose.connection.readyState >= 1) {
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in environment');

  try {
    await mongoose.connect(uri);
    isConnected = true;
    console.log('[DB] MongoDB connected');
  } catch (error) {
    console.error('[DB] Connection failed:', error);
    if (process.env.VERCEL) {
      throw error;
    }
    process.exit(1);
  }
}

