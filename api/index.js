import app from '../backend/src/app.js';

export default function handler(req, res) {
  // Vercel's function path can omit the /api prefix.
  // Normalize it so the existing Express routers keep their /api routes.
  if (!req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }

  return app(req, res);
}
