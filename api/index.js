import app from '../backend/src/app.js';

export default function handler(req, res) {
  // /api/index.js is already mounted under /api by Vercel.
  // Express routes in app.js also use the /api prefix.
  if (!req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }

  return app(req, res);
}
