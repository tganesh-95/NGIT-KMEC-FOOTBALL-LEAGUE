import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import http from 'http';
import path from 'node:path';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { teams, fixtureDocuments } from './data.js';
import { Team, Match } from './models.js';

const app = express(); const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(cors({ origin: true, credentials: true })); app.use(express.json());

const adminPassword = process.env.ADMIN_PASSWORD;
const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
const adminSessions = new Set();
let databaseAvailable = false;
let memoryTeams = teams.map(team => ({ ...team }));
let memoryMatches = fixtureDocuments.map(match => ({ ...match }));
const readCookie = (request, name) => request.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`))?.slice(name.length + 1);
const requireAdmin = (req, res, next) => {
  if (!adminSessions.has(readCookie(req, 'ngit_admin_session'))) return res.status(401).json({ error: 'Admin authentication required' });
  next();
};
const passwordMatches = (candidate, expected) => {
  if (!candidate || !expected) return false;
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return candidateBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
};
const passwordIsValid = async candidate => adminPasswordHash
  ? bcrypt.compare(candidate || '', adminPasswordHash)
  : passwordMatches(candidate, adminPassword);

const standings = async () => {
  const matches = databaseAvailable
    ? await Match.find({ status: 'Completed' }).lean()
    : memoryMatches.filter(match => match.status === 'Completed');
  const table = new Map(teams.map(t => [t.name, { ...t, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }]));
  for (const match of matches) {
    const home = table.get(match.team1); const away = table.get(match.team2);
    if (!home || !away || match.team1Score === null || match.team2Score === null) continue;
    home.mp++; away.mp++; home.gf += match.team1Score; home.ga += match.team2Score; away.gf += match.team2Score; away.ga += match.team1Score;
    if (match.team1Score > match.team2Score) { home.w++; home.pts += 3; away.l++; } else if (match.team1Score < match.team2Score) { away.w++; away.pts += 3; home.l++; } else { home.d++; away.d++; home.pts++; away.pts++; }
  }
  return [...table.values()].map(t => ({ ...t, gd: t.gf - t.ga })).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf).map((t, i, arr) => ({ ...t, position: i && t.pts === arr[i - 1].pts && t.gd === arr[i - 1].gd && t.gf === arr[i - 1].gf ? arr[i - 1].position : i + 1 }));
};
const broadcast = () => io.emit('league:update');

app.post('/api/auth/login', (req, res) => {
  if (!adminPassword && !adminPasswordHash) return res.status(503).json({ error: 'Admin password is not configured. Set ADMIN_PASSWORD_HASH in .env.' });
  passwordIsValid(req.body.password).then(valid => {
    if (!valid) return res.status(401).json({ error: 'Incorrect admin password' });
  const session = crypto.randomBytes(32).toString('hex');
  adminSessions.add(session);
  res.setHeader('Set-Cookie', `ngit_admin_session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);
  res.json({ authenticated: true });
  }).catch(() => res.status(500).json({ error: 'Unable to verify admin credentials' }));
});
app.get('/api/auth/me', (req, res) => res.json({ authenticated: adminSessions.has(readCookie(req, 'ngit_admin_session')) }));
app.post('/api/auth/logout', (req, res) => {
  adminSessions.delete(readCookie(req, 'ngit_admin_session'));
  res.setHeader('Set-Cookie', 'ngit_admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  res.json({ authenticated: false });
});
app.get('/api/teams', async (_req, res) => res.json(databaseAvailable ? await Team.find().sort({ teamId: 1 }).lean() : memoryTeams));
app.get('/api/matches', async (_req, res) => res.json(databaseAvailable ? await Match.find().sort({ matchNumber: 1 }).lean() : memoryMatches));
app.get('/api/standings', async (_req, res) => res.json(await standings()));
app.put('/api/matches/:number/schedule', requireAdmin, async (req, res) => {
  const { date = '', time = '', venue = '' } = req.body;
  const match = databaseAvailable
    ? await Match.findOneAndUpdate({ matchNumber: Number(req.params.number) }, { date, time, venue, status: 'Upcoming', $setOnInsert: {} }, { new: true })
    : memoryMatches.find(item => item.matchNumber === Number(req.params.number));
  if (!match) return res.status(404).json({ error: 'Official fixture not found' });
  if (!databaseAvailable) Object.assign(match, { date, time, venue, status: 'Upcoming' });
  broadcast(); res.json(match);
});
app.put('/api/matches/:number/result', requireAdmin, async (req, res) => {
  const { team1Score, team2Score } = req.body;
  if (!Number.isInteger(team1Score) || !Number.isInteger(team2Score) || team1Score < 0 || team2Score < 0) return res.status(400).json({ error: 'Scores must be non-negative whole numbers' });
  const match = databaseAvailable
    ? await Match.findOneAndUpdate({ matchNumber: Number(req.params.number) }, { team1Score, team2Score, status: 'Completed', resultEnteredAt: new Date() }, { new: true })
    : memoryMatches.find(item => item.matchNumber === Number(req.params.number));
  if (!match) return res.status(404).json({ error: 'Official fixture not found' });
  if (!databaseAvailable) Object.assign(match, { team1Score, team2Score, status: 'Completed', resultEnteredAt: new Date() });
  broadcast(); res.json(match);
});
app.delete('/api/matches/:number/result', requireAdmin, async (req, res) => {
  const match = databaseAvailable
    ? await Match.findOneAndUpdate(
      { matchNumber: Number(req.params.number) },
      { team1Score: null, team2Score: null, resultEnteredAt: null, status: req.body.status || 'Scheduled' },
      { new: true }
    )
    : memoryMatches.find(item => item.matchNumber === Number(req.params.number));
  if (!match) return res.status(404).json({ error: 'Official fixture not found' });
  if (!databaseAvailable) Object.assign(match, { team1Score: null, team2Score: null, resultEnteredAt: null, status: req.body.status || 'Scheduled' });
  broadcast();
  res.json(match);
});
app.put('/api/matches/:number/status', requireAdmin, async (req, res) => {
  const allowed = ['Scheduled', 'Upcoming', 'Live', 'Postponed', 'Completed']; if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'Invalid status' });
  const match = databaseAvailable
    ? await Match.findOneAndUpdate({ matchNumber: Number(req.params.number) }, { status: req.body.status }, { new: true })
    : memoryMatches.find(item => item.matchNumber === Number(req.params.number));
  if (!match) return res.status(404).json({ error: 'Official fixture not found' });
  if (!databaseAvailable) match.status = req.body.status;
  broadcast(); res.json(match);
});

app.use(express.static(path.join(process.cwd(), 'dist')));
app.get('*', (_req, res) => res.sendFile(path.join(process.cwd(), 'dist', 'index.html')));

const seed = async () => {
  await Team.bulkWrite(teams.map(team => ({ updateOne: { filter: { teamId: team.teamId }, update: { $setOnInsert: team }, upsert: true } })));
  const teamNames = new Set(teams.map(team => team.name));
  const existingMatches = await Match.find({ team1: { $in: [...teamNames] }, team2: { $in: [...teamNames] } }).lean();
  const preservedByPair = new Map(existingMatches.map(match => [`${match.team1}\u0000${match.team2}`, match]));
  const matches = fixtureDocuments.map(fixture => {
    const previous = preservedByPair.get(`${fixture.team1}\u0000${fixture.team2}`);
    return previous
      ? { ...fixture, date: previous.date, time: previous.time, venue: previous.venue, team1Score: previous.team1Score, team2Score: previous.team2Score, resultEnteredAt: previous.resultEnteredAt, status: previous.status }
      : fixture;
  });
  await Match.deleteMany({ team1: { $in: [...teamNames] }, team2: { $in: [...teamNames] } });
  await Match.insertMany(matches);
};
const port = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ngit-kmec-league', { serverSelectionTimeoutMS: 5000 })
  .then(() => { databaseAvailable = true; return seed(); })
  .catch(error => console.error('MongoDB connection failed; using in-memory development data:', error.message))
  .finally(() => server.listen(port, () => console.log(`API running on ${port}${databaseAvailable ? '' : ' (in-memory fallback)'}`)));
