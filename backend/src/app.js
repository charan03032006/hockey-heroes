import express from 'express';
import cors from 'cors';

import matchesRouter from './routes/matches.js';
import eventsRouter from './routes/events.js';
import teamsRouter from './routes/teams.js';
import playersRouter from './routes/players.js';
import tournamentsRouter from './routes/tournaments.js';

const app = express();

app.use(cors());
app.use(express.json());

// Keep the health endpoint under /api so local and Vercel production
// requests use the same API contract.
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'hockey-heroes-api' });
});

app.use('/api', matchesRouter);
app.use('/api', eventsRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/players', playersRouter);
app.use('/api/tournaments', tournamentsRouter);

export default app;
