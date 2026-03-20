const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'vet-secret-change-in-production';

if (!process.env.JWT_SECRET) {
  console.warn('\x1b[33m[WARN] JWT_SECRET not set — using insecure default. Set JWT_SECRET in backend/.env before deploying.\x1b[0m');
}

/**
 * Express middleware that verifies the JWT token in the Authorization header.
 * Attach this to all routes that require authentication.
 * Public routes (login, register, password-reset) must be declared BEFORE this middleware.
 */
module.exports = function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No autenticado.' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado.' });
  }
};
