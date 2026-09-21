import mongoose from 'mongoose';

let isMongo = false;
let connectionAttempted = false;

export async function connectDB() {
  if (connectionAttempted) return isMongo;
  connectionAttempted = true;

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri) {
    console.log('[Database] No MONGODB_URI provided in environment.');
    console.log('[Database] Using zero-setup resilient local JSON file store (data/donations.json).');
    isMongo = false;
    return false;
  }

  try {
    console.log(`[Database] Attempting connection to MongoDB at: ${mongoUri.split('@').pop()}...`);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2500,
    });
    isMongo = true;
    console.log('[Database] ✓ Connected to MongoDB successfully via Mongoose.');
    return true;
  } catch (error) {
    console.warn(`[Database] MongoDB connection failed (${error.message}).`);
    console.log('[Database] ✓ Falling back gracefully to zero-setup local JSON file store.');
    isMongo = false;
    return false;
  }
}

export function isMongoDbActive() {
  return isMongo;
}

export function getStorageType() {
  return isMongo ? 'MongoDB (Mongoose)' : 'Local JSON File Store (Zero-Setup)';
}
