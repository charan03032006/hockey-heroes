import express from 'express';
import cors from 'cors';

import matchesRouter from './routes/matches.js';
import eventsRouter from './routes/events.js';
import teamsRouter from './routes/teams.js';
import playersRouter from './routes/players.js';
import tournamentsRouter from './routes/tournaments.js';
import approvalsRouter from './routes/approvals.js';

const app = express();

// Security headers for API responses. Keep this dependency-free so Vercel
// deployments do not require an additional package.
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Set CORS_ORIGINS to a comma-separated list of trusted frontend origins.
// If unset, retain the existing permissive behavior for deployments/previews.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

app.use(express.json({ limit: '1mb' }));

// Keep the health endpoint under /api so local and Vercel production
// requests use the same API contract.
app.get('/api/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, service: 'hockey-heroes-api' });
});

app.use('/api', matchesRouter);
app.use('/api', eventsRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/players', playersRouter);
app.use('/api/tournaments', tournamentsRouter);
app.use('/api/approvals', approvalsRouter);

// Unknown API paths should return JSON, never the frontend HTML document.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found.', path: req.originalUrl });
});

// Consistent API error responses. Avoid leaking stack traces or secrets.
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large. Maximum size is 1 MB.' });
  }
  if (error?.message === 'Origin is not allowed by CORS.') {
    return res.status(403).json({ error: 'This origin is not allowed to access the API.' });
  }
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Request body must contain valid JSON.' });
  }
  console.error('API request failed:', error?.message || error);
  return res.status(500).json({ error: 'An unexpected server error occurred.' });
});

export default app;
