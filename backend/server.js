const path    = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });
const express = require('express');
const cors    = require('cors');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');

// Initialize DB + seed (runs once on startup)
require('./database');

const requireAuth = require('./middleware/auth');

const app = express();

// Gzip compress all JSON responses
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  credentials: true,
}));
app.use(express.json({ limit: '5mb' })); // reduced from 15 mb; enough for base64 photos

// Prevent browser (and Angular withFetch) from caching API responses
app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// Rate limiting: max 10 login attempts per IP per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', loginLimiter);

// JWT authentication: protect all /api routes except login, register, and password-reset
app.use('/api', (req, res, next) => {
  const isLogin       = req.method === 'POST' && req.path === '/auth/login';
  const isRegister    = req.method === 'POST' && req.path === '/auth/usuarios';
  const isReset       = req.method === 'POST' && req.path === '/auth/password-reset';
  const isRecoveryReq = req.method === 'POST' && req.path === '/auth/recovery-request';
  const isRecoveryVer = req.method === 'POST' && req.path === '/auth/recovery-verify';
  if (isLogin || isRegister || isReset || isRecoveryReq || isRecoveryVer) return next();
  return requireAuth(req, res, next);
});

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/duenos',    require('./routes/duenos'));
app.use('/api/mascotas',  require('./routes/mascotas'));
app.use('/api/citas',     require('./routes/citas'));
app.use('/api/consultas', require('./routes/consultas'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reportes',  require('./routes/reportes'));

// ── Production: serve Angular browser build + SPA fallback ──────────────────
if (process.env.NODE_ENV === 'production') {
  const browserDist = path.join(__dirname, '..', 'dist', 'ProyVet', 'browser');
  app.use(express.static(browserDist, { maxAge: '1y' }));
  // Any non-API route returns index.html (Angular handles routing client-side)
  app.get(/^(?!\/api).*$/, (_req, res) => {
    res.sendFile(path.join(browserDist, 'index.html'));
  });
}

// Global error handler — never leak internal details in production
app.use((err, _req, res, _next) => {
  console.error('[API Error]', err.message);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json({ message: isProd ? 'Error interno del servidor.' : err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅  API corriendo en http://localhost:${PORT}`));
