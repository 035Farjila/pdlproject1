import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isMongoDbActive, getStorageType } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const JSON_FILE_PATH = path.join(DATA_DIR, 'donations.json');

// Mongoose Schema for MongoDB
const donationMongooseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  donor: { type: String, required: true, trim: true },
  foodType: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  deadline: { type: Number, required: true }, // Timestamp in ms
  status: {
    type: String,
    enum: ['pending', 'accepted', 'delivered'],
    default: 'pending',
  },
  createdAt: { type: Number, default: () => Date.now() },
});

let MongooseModel = null;
try {
  MongooseModel = mongoose.model('Donation', donationMongooseSchema);
} catch {
  MongooseModel = mongoose.models.Donation;
}

// Ensure local JSON storage directory and file exist
function ensureJsonStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(JSON_FILE_PATH)) {
    fs.writeFileSync(JSON_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
  }
}

function readJsonDonations() {
  ensureJsonStore();
  try {
    const raw = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[Store] Error reading donations.json:', err);
    return [];
  }
}

function writeJsonDonations(donations) {
  ensureJsonStore();
  try {
    fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(donations, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Store] Error writing donations.json:', err);
  }
}

/**
 * Priority Logic:
 * Compute tier from time remaining until deadline:
 * hoursLeft <= 0  -> "Expired"
 * hoursLeft < 1   -> "Critical"
 * hoursLeft < 4   -> "High"
 * hoursLeft >= 4  -> "Medium"
 */
export function computeTier(deadline, now = Date.now()) {
  const hoursLeft = (deadline - now) / (1000 * 60 * 60);
  if (hoursLeft <= 0) return 'Expired';
  if (hoursLeft < 1) return 'Critical';
  if (hoursLeft < 4) return 'High';
  return 'Medium';
}

export function formatTimeLeft(deadline, now = Date.now()) {
  const diffMs = deadline - now;
  const isExpired = diffMs <= 0;
  const absMs = Math.abs(diffMs);
  const totalMinutes = Math.floor(absMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (isExpired) {
    if (hours > 0) return `Expired (${hours}h ${minutes}m ago)`;
    return `Expired (${minutes}m ago)`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }
  return `${minutes}m left`;
}

/**
 * Enrich a donation record with live priority tier, remaining hours, and human-readable time
 */
export function enrichDonation(donation, now = Date.now()) {
  const tier = computeTier(donation.deadline, now);
  const diffHours = (donation.deadline - now) / (1000 * 60 * 60);
  const hoursRemaining = Math.max(0, Math.round(diffHours * 10) / 10);
  const timeLeft = formatTimeLeft(donation.deadline, now);

  return {
    id: donation.id,
    donor: donation.donor,
    foodType: donation.foodType,
    quantity: donation.quantity,
    deadline: donation.deadline,
    status: donation.status,
    createdAt: donation.createdAt,
    tier,
    hoursRemaining,
    timeLeft,
    isExpired: diffHours <= 0,
  };
}

/**
 * Any endpoint returning a list of donations must sort them:
 * Critical -> High -> Medium -> Expired
 * Within the same tier: soonest deadline first, then larger quantity first as tiebreaker.
 */
const TIER_ORDER = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Expired: 3,
};

export function sortDonationsByPriority(donations, now = Date.now()) {
  const enriched = donations.map((d) => enrichDonation(d, now));

  return enriched.sort((a, b) => {
    const tierDiff = (TIER_ORDER[a.tier] ?? 99) - (TIER_ORDER[b.tier] ?? 99);
    if (tierDiff !== 0) return tierDiff;

    // Within same tier, soonest deadline first (ascending timestamp)
    if (a.deadline !== b.deadline) {
      return a.deadline - b.deadline;
    }

    // Tiebreaker: larger quantity first (descending quantity)
    return b.quantity - a.quantity;
  });
}

// Generate human-friendly unique ID
function generateId() {
  return 'dn_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
}

// ----------------- Public Data Methods -----------------

export async function getAllDonations(filterStatus = null) {
  const now = Date.now();
  let list = [];

  if (isMongoDbActive() && MongooseModel) {
    const query = filterStatus ? { status: filterStatus } : {};
    const docs = await MongooseModel.find(query).lean();
    list = docs;
  } else {
    const raw = readJsonDonations();
    list = filterStatus ? raw.filter((d) => d.status === filterStatus) : raw;
  }

  return sortDonationsByPriority(list, now);
}

export async function getDonationById(id) {
  if (isMongoDbActive() && MongooseModel) {
    const doc = await MongooseModel.findOne({ id }).lean();
    return doc ? enrichDonation(doc) : null;
  } else {
    const list = readJsonDonations();
    const found = list.find((d) => d.id === id);
    return found ? enrichDonation(found) : null;
  }
}

export async function createDonation({ donor, foodType, quantity, hoursLeft }) {
  const now = Date.now();
  const parsedHours = Number(hoursLeft);
  if (isNaN(parsedHours) || parsedHours <= 0) {
    throw new Error('Valid hoursLeft (greater than 0) is required');
  }

  const parsedQty = Number(quantity);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    throw new Error('Valid quantity (servings greater than 0) is required');
  }

  const donation = {
    id: generateId(),
    donor: String(donor).trim(),
    foodType: String(foodType).trim(),
    quantity: parsedQty,
    deadline: Math.round(now + parsedHours * 60 * 60 * 1000),
    status: 'pending',
    createdAt: now,
  };

  if (isMongoDbActive() && MongooseModel) {
    await MongooseModel.create(donation);
  } else {
    const list = readJsonDonations();
    list.push(donation);
    writeJsonDonations(list);
  }

  return enrichDonation(donation, now);
}

export async function updateDonationStatus(id, newStatus) {
  const validStatuses = ['pending', 'accepted', 'delivered'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`);
  }

  if (isMongoDbActive() && MongooseModel) {
    const updated = await MongooseModel.findOneAndUpdate(
      { id },
      { status: newStatus },
      { new: true }
    ).lean();
    if (!updated) return null;
    return enrichDonation(updated);
  } else {
    const list = readJsonDonations();
    const index = list.findIndex((d) => d.id === id);
    if (index === -1) return null;

    list[index].status = newStatus;
    writeJsonDonations(list);
    return enrichDonation(list[index]);
  }
}

export async function deleteDonation(id) {
  if (isMongoDbActive() && MongooseModel) {
    const res = await MongooseModel.deleteOne({ id });
    return res.deletedCount > 0;
  } else {
    const list = readJsonDonations();
    const beforeCount = list.length;
    const filtered = list.filter((d) => d.id !== id);
    if (filtered.length < beforeCount) {
      writeJsonDonations(filtered);
      return true;
    }
    return false;
  }
}

export async function getStats() {
  const all = await getAllDonations(); // already enriched and sorted
  const now = Date.now();

  const counts = {
    total: all.length,
    critical: 0,
    high: 0,
    medium: 0,
    expired: 0,
    pending: 0,
    accepted: 0,
    delivered: 0,
    totalServings: 0,
    activeServingsPending: 0,
    storageType: getStorageType(),
  };

  for (const d of all) {
    counts.totalServings += d.quantity;

    if (d.status === 'pending') counts.pending++;
    if (d.status === 'accepted') counts.accepted++;
    if (d.status === 'delivered') counts.delivered++;

    if (d.tier === 'Critical') counts.critical++;
    else if (d.tier === 'High') counts.high++;
    else if (d.tier === 'Medium') counts.medium++;
    else if (d.tier === 'Expired') counts.expired++;

    if (d.status === 'pending' && !d.isExpired) {
      counts.activeServingsPending += d.quantity;
    }
  }

  return counts;
}

/**
 * Seed 3 sample donations on first run so the demo isn't empty:
 * 1. Critical (< 1 hour remaining)
 * 2. High (< 4 hours remaining)
 * 3. Medium (>= 4 hours remaining)
 */
export async function seedInitialDataIfEmpty() {
  const current = await getAllDonations();
  if (current.length > 0) {
    console.log(`[Database] Found ${current.length} existing donation(s). Skipping seeding.`);
    return;
  }

  console.log('[Database] Database is empty. Seeding 3 sample donations (Critical, High, Medium)...');
  const now = Date.now();

  const samples = [
    {
      id: 'dn_sample_critical',
      donor: 'Harbor View Gourmet Bistro',
      foodType: 'Prepared Bento Boxes: Teriyaki Salmon & Steamed Veggies',
      quantity: 32,
      deadline: Math.round(now + 0.65 * 60 * 60 * 1000), // ~39 mins left -> Critical
      status: 'pending',
      createdAt: now - 35 * 60 * 1000,
    },
    {
      id: 'dn_sample_high',
      donor: 'Artisan Hearth Bakery & Deli',
      foodType: 'Fresh Sourdough Boules, Focaccia & Roasted Turkey Paninis',
      quantity: 48,
      deadline: Math.round(now + 2.4 * 60 * 60 * 1000), // ~2.4 hours left -> High
      status: 'pending',
      createdAt: now - 20 * 60 * 1000,
    },
    {
      id: 'dn_sample_medium',
      donor: 'Apex Innovation Campus Cafeteria',
      foodType: 'Catering Buffet Surplus: Mediterranean Grilled Bowls & Hummus',
      quantity: 75,
      deadline: Math.round(now + 6.0 * 60 * 60 * 1000), // ~6 hours left -> Medium
      status: 'pending',
      createdAt: now - 10 * 60 * 1000,
    },
  ];

  if (isMongoDbActive() && MongooseModel) {
    await MongooseModel.insertMany(samples);
  } else {
    writeJsonDonations(samples);
  }

  console.log('[Database] ✓ Successfully seeded 3 sample donations with dynamic deadlines.');
}
