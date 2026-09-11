import app from '../backend/src/app.js';

export default function handler(req, res) {
  // Vercel catch-all functions are mounted under /api.
  // The Express application expects the same /api prefix.
  if (!req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }

  return app(req, res);
}
