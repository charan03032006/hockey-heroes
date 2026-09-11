import app from '../backend/src/app.js';

export default function handler(req, res) {
  // Vercel rewrites /api/:path* to this function and stores the
  // original API path in the `path` query parameter.
  const requestedPath = req.query?.path;

  if (typeof requestedPath === 'string') {
    const query = new URLSearchParams(req.query);
    query.delete('path');
    const suffix = query.toString();
    req.url = `/api/${requestedPath}${suffix ? `?${suffix}` : ''}`;
  } else if (!req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }

  return app(req, res);
}
