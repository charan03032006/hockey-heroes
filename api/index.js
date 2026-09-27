import app from '../backend/src/app.js';

export default function handler(req, res) {
  // Vercel rewrites /api/:path* to /api/index?path=:path*.
  // Rebuild the Express URL without losing repeated query parameters.
  const requestedPath = req.query?.path;
  const pathParts = Array.isArray(requestedPath)
    ? requestedPath
    : typeof requestedPath === 'string'
      ? [requestedPath]
      : [];

  const apiPath = pathParts
    .flatMap((part) => String(part).split('/'))
    .filter(Boolean)
    .join('/');

  if (apiPath) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query || {})) {
      if (key === 'path' || value == null) continue;
      if (Array.isArray(value)) {
        value.forEach((item) => query.append(key, String(item)));
      } else {
        query.append(key, String(value));
      }
    }
    const suffix = query.toString();
    req.url = `/api/${apiPath}${suffix ? `?${suffix}` : ''}`;
  } else if (!req.url?.startsWith('/api')) {
    req.url = `/api${req.url?.startsWith('/') ? '' : '/'}${req.url || ''}`;
  }

  return app(req, res);
}
