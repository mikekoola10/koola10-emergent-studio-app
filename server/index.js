'use strict';
/**
 * Koola10 Emergent Studio — backend API.
 * Serves the React frontend's apiClient contracts (see ../src/lib/api.ts).
 *
 * Env: PORT (3001), GEMINI_API_KEY, DATABASE_URL (optional), FRONTEND_URL (optional),
 *      LORE_PATH (default ../episodes/universe/scripts/MASTER_BIBLE.md)
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');

const PORT = parseInt(process.env.PORT || '3001', 10);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const DATABASE_URL = process.env.DATABASE_URL || '';
const FRONTEND_URL = (process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');
const LORE_PATH = process.env.LORE_PATH
  ? path.resolve(process.env.LORE_PATH)
  : path.resolve(__dirname, '..', 'episodes', 'universe', 'scripts', 'MASTER_BIBLE.md');

const DEFAULT_MODEL = 'gemini-2.5-flash';
const VIDEO_STUB_ERROR =
  'Video generation is not connected yet — the studio backend has no video provider configured.';

// ---------------------------------------------------------------------------
// Lore bible (loaded once at boot)
// ---------------------------------------------------------------------------
let bibleText = '';
try {
  bibleText = fs.readFileSync(LORE_PATH, 'utf8');
  console.log(`[studio-api] loaded lore bible (${bibleText.length} chars) from ${LORE_PATH}`);
} catch (err) {
  console.warn(`[studio-api] WARNING: could not read lore bible at ${LORE_PATH}: ${err.message}`);
}

// ---------------------------------------------------------------------------
// Episode storage: Neon Postgres if DATABASE_URL set, else ephemeral memory
// ---------------------------------------------------------------------------
let pgPool = null;
const memoryEpisodes = []; // newest-first

if (DATABASE_URL) {
  const { Pool } = require('pg');
  pgPool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  pgPool.on('error', (err) => console.error('[studio-api] pg pool error:', err.message));
  console.log('[studio-api] using Neon Postgres for episode storage');
} else {
  console.warn('[studio-api] WARNING: DATABASE_URL not set — episodes are ephemeral (in-memory only)');
}

function rowToEpisode(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    status: row.status || 'draft',
  };
}

async function listEpisodes() {
  if (pgPool) {
    const { rows } = await pgPool.query(
      'SELECT id, title, description, status, created_at FROM studio_episodes ORDER BY created_at DESC LIMIT 200'
    );
    return rows.map(rowToEpisode);
  }
  return memoryEpisodes.slice();
}

async function saveEpisode(ep) {
  if (pgPool) {
    await pgPool.query(
      'INSERT INTO studio_episodes (id, title, description, status, created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING',
      [ep.id, ep.title, ep.description, ep.status, ep.createdAt]
    );
  } else {
    memoryEpisodes.unshift(ep);
  }
  return ep;
}

// ---------------------------------------------------------------------------
// In-memory video job registry (honest stub — no video provider configured)
// ---------------------------------------------------------------------------
const videoJobs = new Map();

// ---------------------------------------------------------------------------
// Gemini helper
// ---------------------------------------------------------------------------
function geminiContentsFromMessages(messages) {
  return (messages || [])
    .filter((m) => m && typeof m.content === 'string')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
}

function extractText(geminiJson) {
  try {
    const parts = geminiJson?.candidates?.[0]?.content?.parts || [];
    return parts
      .map((p) => p.text || '')
      .join('')
      .trim();
  } catch {
    return '';
  }
}

async function geminiGenerate({ model, systemInstruction, contents }) {
  const body = { contents };
  if (systemInstruction) body.system_instruction = { parts: [{ text: systemInstruction }] };
  let res;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
        body: JSON.stringify(body),
      }
    );
  } catch (err) {
    const e = new Error(`Could not reach the AI service: ${err.message}`);
    e.status = 502;
    throw e;
  }
  if (!res.ok) {
    let detail = '';
    try {
      const errJson = await res.json();
      detail = errJson?.error?.message ? ` ${String(errJson.error.message).slice(0, 200)}` : '';
    } catch {
      /* ignore parse errors */
    }
    const e = new Error(`AI service returned ${res.status}.${detail}`);
    e.status = 502;
    throw e;
  }
  return res.json();
}

function requireAiKey(res) {
  if (!GEMINI_API_KEY) {
    res.status(503).json({ error: 'AI is not configured yet.' });
    return false;
  }
  return true;
}

function rid() {
  return crypto.randomBytes(8).toString('hex');
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

// CORS: allow FRONTEND_URL (exact origin) + any http://localhost:* origin. Never '*'.
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curl / server-to-server
    if (FRONTEND_URL && origin === FRONTEND_URL) return cb(null, true);
    if (/^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
    return cb(new Error('CORS: origin not allowed'));
  },
};
app.use(cors(corsOptions));

// Request logging: method + path + status only (no bodies, no keys).
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[studio-api] ${req.method} ${req.path} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => res.json({ ok: true }));

// --- Studio chat ---
app.post('/ai/chat', async (req, res) => {
  if (!requireAiKey(res)) return;
  const { messages, model } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array.' });
  }
  const useModel = typeof model === 'string' && model.trim() ? model.trim() : DEFAULT_MODEL;
  try {
    const data = await geminiGenerate({
      model: useModel,
      contents: geminiContentsFromMessages(messages),
    });
    const text = extractText(data);
    if (!text) return res.status(502).json({ error: 'AI returned an empty response.' });
    res.json({ response: text, model: useModel });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Chat failed.' });
  }
});

// --- Episodes ---
app.get('/studio/episodes', async (_req, res) => {
  try {
    res.json(await listEpisodes());
  } catch (err) {
    console.error('[studio-api] listEpisodes:', err.message);
    res.status(500).json({ error: 'Could not load episodes.' });
  }
});

app.post('/studio/episode', async (req, res) => {
  const { title, description } = req.body || {};
  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required.' });
  }
  const ep = {
    id: rid(),
    title: title.trim(),
    description: typeof description === 'string' ? description : '',
    createdAt: new Date().toISOString(),
    status: 'draft',
  };
  try {
    res.status(201).json(await saveEpisode(ep));
  } catch (err) {
    console.error('[studio-api] saveEpisode:', err.message);
    res.status(500).json({ error: 'Could not save episode.' });
  }
});

// --- Lore console ---
const LORE_KEEPER_INSTRUCTION =
  'You are the lore keeper of the KOOLA10 universe. Answer ONLY from the Master Bible below. ' +
  "If the answer isn't in it, say so plainly and offer a plausible extension clearly marked as your invention. " +
  'Keep answers vivid but concise.\n\n--- MASTER BIBLE ---\n';

app.post('/studio/lore', async (req, res) => {
  if (!requireAiKey(res)) return;
  const { question } = req.body || {};
  if (typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'question is required.' });
  }
  try {
    const data = await geminiGenerate({
      model: DEFAULT_MODEL,
      systemInstruction: LORE_KEEPER_INSTRUCTION + (bibleText || '(bible unavailable)'),
      contents: [{ role: 'user', parts: [{ text: question.trim() }] }],
    });
    const text = extractText(data);
    if (!text) return res.status(502).json({ error: 'AI returned an empty response.' });
    res.json({ answer: text });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Lore lookup failed.' });
  }
});

// --- Style engine ---
app.post('/studio/style', async (req, res) => {
  if (!requireAiKey(res)) return;
  const { scene } = req.body || {};
  if (typeof scene !== 'string' || !scene.trim()) {
    return res.status(400).json({ error: 'scene is required.' });
  }
  const prompt =
    'Given this scene, return ONLY JSON with exactly these keys: {"styleRules": "...", "videoPrompt": "..."}. ' +
    'styleRules: concise visual style rules for the scene. videoPrompt: a ready-to-use video generation prompt.\n\nScene:\n' +
    scene.trim();
  try {
    const data = await geminiGenerate({
      model: DEFAULT_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const raw = extractText(data);
    if (!raw) return res.status(502).json({ error: 'AI returned an empty response.' });
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      return res.json({
        styleRules: String(parsed.styleRules || ''),
        videoPrompt: String(parsed.videoPrompt || ''),
      });
    } catch {
      return res.json({ styleRules: raw, videoPrompt: '' });
    }
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Style generation failed.' });
  }
});

// --- Video orchestrator (honest stub: no video provider configured) ---
app.post('/studio/video-job', (req, res) => {
  const { prompt } = req.body || {};
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt is required.' });
  }
  const job = {
    jobId: rid(),
    status: 'failed',
    createdAt: new Date().toISOString(),
    error: VIDEO_STUB_ERROR,
  };
  videoJobs.set(job.jobId, job);
  res.status(201).json(job);
});

app.get('/studio/video-job/:id', (req, res) => {
  const job = videoJobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Unknown job' });
  res.json(job);
});

// 404 + error handlers
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err && err.message && err.message.startsWith('CORS')) {
    return res.status(403).json({ error: 'Origin not allowed.' });
  }
  console.error('[studio-api] unhandled:', err && err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`[studio-api] listening on :${PORT}`);
});
