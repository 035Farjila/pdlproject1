import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDB, getStorageType } from './db.js';
import { seedInitialDataIfEmpty } from './models/donation.js';
import donationsRouter from './routes/donations.js';
import statsRouter from './routes/stats.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.join(__dirname, '../frontend');

const app = express();
const PORT = 3000;

// Body parser middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

// API Routes
app.use('/api/donations', donationsRouter);
app.use('/api/stats', statsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    storage: getStorageType(),
  });
});

// Static assets from frontend directory
app.use(express.static(FRONTEND_DIR, { index: false }));

// Direct friendly routes for student navigation & testing
app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'login.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'login.html'));
});

app.get('/donor', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'donor.html'));
});

app.get('/receiver', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'receiver.html'));
});

app.get('/volunteer', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'volunteer.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'admin.html'));
});

// 404 fallback for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `API endpoint not found: ${req.originalUrl}` });
});

// For any other browser page request, serve login.html
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'login.html'));
});

// Bootstrap server
async function startServer() {
  console.log('==============================================');
  console.log('  NourishFlow AI - Food Rescue Backend');
  console.log('==============================================');

  await connectDB();
  await seedInitialDataIfEmpty();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ NourishFlow AI server running at http://0.0.0.0:${PORT}`);
    console.log(`✓ Active Storage: ${getStorageType()}`);
    console.log(`✓ Frontend static files served from: ${FRONTEND_DIR}`);
    console.log('==============================================');
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
