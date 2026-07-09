import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in environment');

  try {
    await mongoose.connect(uri);
    console.log('[DB] MongoDB connected');
  } catch (error) {
    console.error('[DB] Connection failed:', error);
    process.exit(1);
  }
}
