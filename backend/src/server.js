import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import matchesRouter from './routes/matches.js';
import eventsRouter from './routes/events.js';
import teamsRouter from './routes/teams.js';
import playersRouter from './routes/players.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/matches', matchesRouter);
app.use('/api', eventsRouter); // handles /api/matches/:matchId/events and /api/events/:id
app.use('/api/teams', teamsRouter);
app.use('/api/players', playersRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Hockey Heroes API running on port ${PORT}`));
