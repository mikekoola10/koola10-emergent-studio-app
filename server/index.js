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
const multer = require('multer');

const PORT = parseInt(process.env.PORT || '3001', 10);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const DATABASE_URL = process.env.DATABASE_URL || '';
const FRONTEND_URL = (process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');
const LORE_PATH = process.env.LORE_PATH
  ? path.resolve(process.env.LORE_PATH)
  : path.resolve(__dirname, '..', 'episodes', 'universe', 'scripts', 'MASTER_BIBLE.md');

const DEFAULT_MODEL = 'gemini-3.6-flash';

// The chat UI offers persona names (e.g. "nova") that are not real Gemini
// model IDs. Only pass through names that look like actual Gemini models;
// everything else falls back to the default so the request never 404s.
function sanitizeModel(name) {
  const m = typeof name === 'string' ? name.trim() : '';
  return /^gemini-[a-z0-9.-]+$/i.test(m) ? m : DEFAULT_MODEL;
}
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
  const useModel = sanitizeModel(model);
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

// ---------------------------------------------------------------------------
// Nova's memory vault ("the actual Jarvis" memory system)
// ---------------------------------------------------------------------------
// Durable facts about the producer, persisted in Neon Postgres (nova_memories)
// or in-memory when DATABASE_URL is unset. Loaded into Nova's system prompt
// on every /ai/beatlab request; new facts are extracted from each turn by a
// lightweight Gemini call and stored only if genuinely new.
const SEED_FACTS = [
  { id: 'seed-setup-daw', category: 'setup', memory: 'Produces beats in FL Studio 25 — a personal music project, not a Spiral Academy business offering.' },
  { id: 'seed-setup-flex', category: 'setup', memory: 'Uses the FLEX plugin a lot when making beats.' },
  { id: 'seed-setup-stock-limits', category: 'setup', memory: 'Fruity Limiter and 3xOSC are unusable in their setup — give sidechain and sound-design methods that do not need them (e.g. Fruity Peak Controller for sidechaining).' },
  { id: 'seed-pref-plain-english', category: 'preference', memory: 'Prefers plain-English, knob-by-knob plugin explanations with no assumed music training — describe what they will hear when turning each control.' },
  { id: 'seed-goal-own-plugins', category: 'goal', memory: 'Rebuilding stock FL Studio plugins themselves in the mikekoola10/fl-studio-plugins repo, because stock features keep turning into paid ones — keep recommendations Image-Line-independent where possible.' },
  { id: 'seed-goal-jarvis', category: 'goal', memory: 'Wants Nova to become a real Jarvis-style assistant with persistent memory that knows them across conversations.' },
];

const MEMORY_CATEGORIES = new Set(['setup', 'preference', 'feedback', 'goal', 'workflow', 'fact']);
const MAX_MEMORIES = 60;

// In-memory fallback (used when DATABASE_URL is unset). Seeded at boot.
const memoryStore = SEED_FACTS.map((f) => ({
  id: f.id,
  memory: f.memory,
  category: f.category,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

function normalizeFact(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Common words that dilute similarity scores.
const FACT_STOPWORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'for', 'to', 'of', 'and', 'or', 'as',
  'is', 'are', 'was', 'were', 'be', 'been', 'their', 'they', 'them',
  'with', 'at', 'by', 'not', 'it', 'its', 'this', 'that',
]);

function factWords(s) {
  return normalizeFact(s)
    .split(' ')
    .filter((w) => w && !FACT_STOPWORDS.has(w))
    // tiny plural stem: "produces" -> "produce" (but keep "bass", "808s" -> "808")
    .map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));
}

// True when two fact strings say the same thing (exact match, containment,
// or high word overlap after stopword removal). Used to avoid storing
// duplicates while never merging genuinely distinct facts.
function factsSimilar(a, b) {
  const na = normalizeFact(a);
  const nb = normalizeFact(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const wa = new Set(factWords(a));
  const wb = new Set(factWords(b));
  if (wa.size === 0 || wb.size === 0) return false;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  const union = new Set([...wa, ...wb]).size;
  return union > 0 && inter / union >= 0.55;
}

async function listMemories(limit = 40) {
  const n = Math.max(1, Math.min(100, parseInt(limit, 10) || 40));
  if (pgPool) {
    const { rows } = await pgPool.query(
      'SELECT id, memory, category, created_at, updated_at FROM nova_memories ORDER BY updated_at DESC LIMIT $1',
      [n]
    );
    return rows;
  }
  return memoryStore
    .slice()
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, n);
}

// Stores a fact only if genuinely new. If a similar fact already exists,
// refreshes its updated_at instead of duplicating.
// Returns 'inserted' | 'refreshed' | 'skipped'.
async function saveMemory({ category, memory }) {
  const text = String(memory || '').trim().slice(0, 300);
  if (!text) return 'skipped';
  const cat = MEMORY_CATEGORIES.has(category) ? category : 'fact';
  if (pgPool) {
    const { rows } = await pgPool.query('SELECT id, memory FROM nova_memories');
    const dup = rows.find((r) => factsSimilar(r.memory, text));
    if (dup) {
      await pgPool.query('UPDATE nova_memories SET updated_at = NOW() WHERE id = $1', [dup.id]);
      return 'refreshed';
    }
    await pgPool.query(
      'INSERT INTO nova_memories (id, memory, category) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
      [rid(), text, cat]
    );
    await pgPool.query(
      'DELETE FROM nova_memories WHERE id IN (SELECT id FROM nova_memories ORDER BY updated_at DESC OFFSET $1)',
      [MAX_MEMORIES]
    );
    return 'inserted';
  }
  const dup = memoryStore.find((m) => factsSimilar(m.memory, text));
  if (dup) {
    dup.updated_at = new Date().toISOString();
    return 'refreshed';
  }
  memoryStore.push({
    id: rid(),
    memory: text,
    category: cat,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  memoryStore.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  if (memoryStore.length > MAX_MEMORIES) memoryStore.length = MAX_MEMORIES;
  return 'inserted';
}

function formatMemoriesForPrompt(memories) {
  if (!memories || memories.length === 0) return '';
  const lines = memories.map((m) => `- [${m.category || 'fact'}] ${m.memory}`);
  return (
    '\n\nWhat you remember about this producer (your long-term memory — weave it in naturally when relevant, never recite it as a list unprompted):\n' +
    lines.join('\n')
  );
}

const MEMORY_EXTRACT_SYSTEM = `[MEMORY-EXTRACT] You extract durable facts for a producer's long-term memory vault.
Rules:
- Return ONLY a JSON array, no other text, no code fences.
- Each item: {"category": "<one of: setup, preference, feedback, goal, workflow, fact>", "memory": "<one concise sentence>"}.
- DURABLE = their setup/gear, lasting preferences, mix feedback history, goals, workflow habits. NOT durable = greetings, one-off chatter, trivia, or anything already obvious from the conversation topic.
- Maximum 3 items. If nothing durable was said, return [].`;

// Pulls durable facts from one conversation turn and stores genuinely new ones.
// Fire-and-forget: never blocks or breaks the chat response.
async function extractAndStoreMemories(userText, novaText) {
  const convo =
    `Producer: ${String(userText || '').slice(0, 1500)}\n` +
    `Nova: ${String(novaText || '').slice(0, 1500)}`;
  const data = await geminiGenerate({
    model: DEFAULT_MODEL,
    systemInstruction: MEMORY_EXTRACT_SYSTEM,
    contents: [{ role: 'user', parts: [{ text: convo }] }],
  });
  const raw = extractText(data).replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  if (!raw) return [];
  let facts;
  try {
    facts = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(facts)) facts = facts && Array.isArray(facts.facts) ? facts.facts : [];
  const results = [];
  for (const f of facts.slice(0, 3)) {
    if (!f || typeof f.memory !== 'string') continue;
    try {
      results.push(await saveMemory({ category: f.category, memory: f.memory }));
    } catch (err) {
      console.error('[studio-api] saveMemory:', err.message);
    }
  }
  return results;
}

// --- Beat Lab: Nova as a mixing & mastering coach ---
// The user produces beats in FL Studio. This endpoint answers mixing/mastering
// questions with concrete, FL-Studio-specific guidance (stock plugins, settings,
// signal chains). It cannot hear audio — it coaches from the user's description.
const BEATLAB_SYSTEM = `You are Nova, the mixing and mastering coach inside Koola10 Emergent Studio. The person you're helping makes hip-hop beats in FL Studio (currently FL Studio 25) and wants them to sound professional — these beats are the soundtrack of their virtual world, so quality matters to them.

How you work:
- Give concrete, actionable answers: exact FL Studio stock plugins (Parametric EQ 2, Fruity Compressor, Fruity Limiter, Maximus, Fruity Reeverb 2, Delay 3, Soundgoodizer, etc.), starting settings with numbers (frequencies, ratios, attack/release times), and why each move works.
- Diagnose from descriptions: if they say "my 808 is muddy" or "vocals sound buried," walk through the likely causes in order and give fixes.
- Cover the full craft: gain staging, EQ, compression, saturation, stereo imaging, reverb/delay, arrangement balance, mix bus processing, and mastering chains with loudness targets for streaming (Spotify/Apple/YouTube, around -14 LUFS integrated, true peak under -1 dBTP).
- Keep answers focused and scannable: short intro, then steps or bullet points. No fluff, no generic motivational filler.
- When a question is ambiguous, ask one clarifying question instead of guessing (e.g. "is the muddiness on laptop speakers, headphones, or both?").
- Be honest about limits: you can't hear their audio, so your advice comes from their description. Never pretend you listened to a track.
- Stay in character as Nova: warm, direct, studio-rat energy. You can reference the Koola10 Diner's "jukebox rule" (newest beat or shuffle) lightly when it fits, but the craft comes first.`;

app.post('/ai/beatlab', async (req, res) => {
  if (!requireAiKey(res)) return;
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array.' });
  }
  // Load Nova's long-term memory (graceful if the table doesn't exist yet).
  let memoryBlock = '';
  try {
    memoryBlock = formatMemoriesForPrompt(await listMemories(40));
  } catch (err) {
    console.error('[studio-api] load memories:', err.message);
  }
  try {
    const data = await geminiGenerate({
      model: DEFAULT_MODEL,
      systemInstruction: BEATLAB_SYSTEM + memoryBlock,
      contents: geminiContentsFromMessages(messages),
    });
    const text = extractText(data);
    if (!text) return res.status(502).json({ error: 'AI returned an empty response.' });
    res.json({ response: text, model: DEFAULT_MODEL });
    // Learn from this turn in the background — never blocks the reply.
    const lastUser = [...messages]
      .reverse()
      .find((m) => m && m.role !== 'assistant' && typeof m.content === 'string');
    extractAndStoreMemories(lastUser ? lastUser.content : '', text).catch((err) =>
      console.error('[studio-api] memory extract:', err.message)
    );
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Beat Lab failed.' });
  }
});

// --- Beat Lab: Nova LISTENS to an uploaded bounce and critiques the mix ---
// The user exports an MP3/WAV bounce from FL Studio on their laptop, attaches
// it here, and Gemini hears the actual audio (inline_data). Nova then gives a
// real mix critique with FL Studio-specific fixes. Max 15MB keeps us safely
// under Gemini's 20MB inline request limit (a 3-min 128kbps MP3 is ~3MB).
const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const okType = /^audio\//.test(file.mimetype || '');
    const okExt = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|webm)$/i.test(file.originalname || '');
    if (okType || okExt) return cb(null, true);
    cb(new Error('Only audio files are accepted (mp3, wav, ogg, m4a, aac, flac).'));
  },
}).single('audio');

const BEATLAB_LISTEN_SYSTEM = `You are Nova, the mixing and mastering coach inside Koola10 Emergent Studio. The person you're helping makes hip-hop beats in FL Studio (currently FL Studio 25) on their laptop, and these beats are the soundtrack of their virtual world — quality matters to them.

You are now LISTENING to an actual bounce of their beat (audio is attached to the message). Give a real mix critique based on what you HEAR — not generic advice. Structure it like this:
1. First impression (one or two sentences — what hits you, good or bad).
2. Low end — kick/808 relationship, mud, weight. Name what you hear.
3. Mids & highs — harshness, clarity, presence. Name frequencies you suspect.
4. Dynamics & loudness — does it breathe, does it feel squashed, how does the energy compare to a finished record.
5. Stereo image & space — width, reverb/delay use, anything phasey or hollow.
6. Top 3 fixes, in order of impact, each with the exact FL Studio stock plugin and starting settings (Parametric EQ 2, Fruity Compressor, Fruity Limiter, Maximus, Fruity Reeverb 2, Delay 3, etc. — frequencies, ratios, attack/release times, and WHY each move works).

Rules:
- Be specific about what you hear. If a section is unclear or the audio is too short to judge something, say so instead of inventing detail.
- Honest caveat, stated once: you're hearing a compressed stream, not their studio monitors — flag what you're confident about vs. what they should verify on their own speakers/headphones.
- If they asked a specific question, answer it first, then give the critique.
- Keep it scannable: short intro, then the numbered sections. No fluff.
- Stay in character as Nova: warm, direct, studio-rat energy.`;

app.post('/ai/beatlab-listen', (req, res) => {
  uploadAudio(req, res, async (err) => {
    if (err) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'That file is too big — keep bounces under 15MB (a 128kbps MP3 bounce is plenty for a mix check).'
          : err.message || 'Could not read the uploaded audio.';
      return res.status(400).json({ error: msg });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Attach a bounce first (mp3, wav, ogg, m4a, aac, flac).' });
    }
    if (!requireAiKey(res)) return;
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    const audioBase64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'audio/mpeg';
    const prompt = question
      ? `The producer asks: "${question}"\n\nAnswer their question first, then give your full mix critique of the attached bounce.`
      : 'Give your full mix critique of the attached bounce.';
    try {
      const data = await geminiGenerate({
        model: DEFAULT_MODEL,
        systemInstruction: BEATLAB_LISTEN_SYSTEM,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: audioBase64 } },
            ],
          },
        ],
      });
      const text = extractText(data);
      if (!text) return res.status(502).json({ error: 'AI returned an empty response.' });
      res.json({ response: text, model: DEFAULT_MODEL });
    } catch (err2) {
      res.status(err2.status || 500).json({ error: err2.message || 'Beat Lab listen failed.' });
    }
  });
});

// --- Beat Lab: Sound Designer — text prompt → synth parameters + 3xOSC dial-in ---
// Deterministic take on the fl-studio-plugins ai-engine idea
// (prompt_parser + style_map + parameter_schema). No AI call: instant, offline,
// and the same description always produces the same starting point.
const SOUND_BASE_PARAMS = {
  osc_type: 'saw', detune: 0.12, cutoff: 800, resonance: 0.3,
  attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.5,
  reverb: 0.4, distortion: 0.6,
};

// keyword -> { param: defaultValue }. Later words override earlier ones.
const SOUND_STYLE_MAP = {
  dark:   { cutoff: 300, distortion: 0.7 },
  ambient:{ reverb: 0.75, attack: 0.3, release: 0.9 },
  pad:    { sustain: 0.8, detune: 0.1 },
  bass:   { osc_type: 'sine', cutoff: 120, decay: 0.1 },
  rage:   { osc_type: 'saw', distortion: 0.85, detune: 0.45 },
  lead:   { osc_type: 'saw', cutoff: 1500, resonance: 0.55 },
  bright: { cutoff: 2200, resonance: 0.65 },
  pluck:  { attack: 0.02, decay: 0.2, sustain: 0.05, release: 0.3 },
  '808':  { osc_type: 'sine', cutoff: 90, decay: 0.45, sustain: 0.65, distortion: 0.2 },
  sub:    { osc_type: 'sine', cutoff: 70, attack: 0.01, release: 0.2 },
  deep:   { cutoff: 150 },
  warm:   { cutoff: 500, resonance: 0.2, distortion: 0.15 },
  smooth: { attack: 0.08, resonance: 0.2 },
  hard:   { distortion: 0.75, attack: 0.01 },
  aggressive: { distortion: 0.85, cutoff: 1500 },
  soft:   { attack: 0.12, cutoff: 700, distortion: 0.1 },
  mellow: { attack: 0.12, cutoff: 700, distortion: 0.1 },
  bell:   { osc_type: 'sine', attack: 0.01, decay: 1.0, sustain: 0.2, detune: 0.05 },
  keys:   { attack: 0.01, decay: 0.4, sustain: 0.5, cutoff: 1200 },
  strings:{ attack: 0.3, sustain: 0.9, release: 0.7, detune: 0.15, reverb: 0.65 },
  arp:    { attack: 0.01, decay: 0.15, sustain: 0.05, cutoff: 2000 },
  stab:   { attack: 0.008, decay: 0.25, sustain: 0.2, cutoff: 1000 },
  brass:  { osc_type: 'saw', attack: 0.08, sustain: 0.8, cutoff: 1200 },
  choir:  { attack: 0.2, sustain: 0.8, reverb: 0.6, detune: 0.12 },
  vocal:  { attack: 0.2, sustain: 0.8, reverb: 0.6, detune: 0.12 },
  airy:   { cutoff: 4000, reverb: 0.75, attack: 0.2 },
  wide:   { detune: 0.25, reverb: 0.6 },
  gritty: { distortion: 0.65, cutoff: 900 },
  clean:  { distortion: 0.05, resonance: 0.2 },
  punchy: { attack: 0.01, decay: 0.2, distortion: 0.3 },
  boomy:  { cutoff: 110, resonance: 0.45, decay: 0.45 },
  metallic:{ osc_type: 'square', resonance: 0.75, cutoff: 2500 },
  glassy: { osc_type: 'triangle', cutoff: 5000, reverb: 0.65 },
  lofi:   { cutoff: 800, distortion: 0.3, attack: 0.02 },
  drill:  { osc_type: 'sine', cutoff: 100, distortion: 0.35, decay: 0.45 },
};

function designSound(description) {
  const params = { ...SOUND_BASE_PARAMS };
  const words = String(description).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const matched = [];
  for (const w of words) {
    const traits = SOUND_STYLE_MAP[w];
    if (!traits || matched.includes(w)) continue;
    matched.push(w);
    for (const [param, value] of Object.entries(traits)) params[param] = value;
  }
  return { params, matched };
}

function dialInSteps(p) {
  const steps = [];
  const shape = ['saw', 'square', 'triangle', 'sine'].includes(p.osc_type) ? p.osc_type : 'saw';
  steps.push({
    title: 'Load 3xOSC',
    detail: 'Add a 3xOSC to the channel rack — it is stock in every FL Studio edition.',
  });
  steps.push({
    title: 'Oscillator shape',
    detail: `Set the oscillator waveform to ${shape}. Start with only Osc 1 turned up; layer Osc 2 later if you want it thicker.`,
  });
  const cents = Math.round(p.detune * 50);
  steps.push({
    title: 'Detune for width',
    detail: `Turn up Osc 2 and set its fine-tune to about +${cents} cents (leave Osc 1 at 0). More detune = wider; past ~25 cents it starts sounding out of tune — trust your ears.`,
  });
  steps.push({
    title: 'Filter',
    detail: `Filter cutoff ≈ ${Math.round(p.cutoff)} Hz, resonance ≈ ${Math.round(p.resonance * 100)}%. Low cutoff = darker and rounder; open it up for brightness.`,
  });
  steps.push({
    title: 'Volume envelope',
    detail: `Attack ${p.attack}s, decay ${p.decay}s, sustain ${Math.round(p.sustain * 100)}%, release ${p.release}s. Short attack + short decay = plucky; long attack + high sustain = pad.`,
  });
  if (p.distortion >= 0.15) {
    steps.push({
      title: 'Grit',
      detail: `On the mixer slot, add Fruity Blood Overdrive with drive ≈ ${Math.round(p.distortion * 100)}%. This is where the aggression lives — back it off if it eats the low end.`,
    });
  }
  if (p.reverb >= 0.15) {
    steps.push({
      title: 'Space',
      detail: `On the mixer slot, add Fruity Reeverb 2 with the wet level ≈ ${Math.round(p.reverb * 100)}%. Keep bass sounds drier — reverb on sub frequencies turns to mud.`,
    });
  }
  return steps;
}

app.post('/ai/beatlab-design', (req, res) => {
  const { description } = req.body || {};
  if (typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ error: 'Describe the sound first (e.g. "dark 808" or "airy bell arp").' });
  }
  const clean = description.trim().slice(0, 200);
  const { params, matched } = designSound(clean);
  res.json({
    description: clean,
    matched,
    parameters: params,
    dial_in: dialInSteps(params),
    note: matched.length === 0
      ? 'No sound keywords matched — you got the neutral starting point. Try words like 808, pluck, pad, bell, strings, dark, bright, gritty, lofi.'
      : 'Same description always gives the same starting point — tweak by ear from here, or describe tweaks to Nova in the Coach tab.',
  });
});

// --- Nova ambient: spoken Q&A for the /nova wall display ---
// The /nova page listens through the device mic; when it hears "Nova" it
// POSTs here. Replies must stay short — they are SPOKEN aloud on the page.
const NOVA_BRIEFING_PATH = path.resolve(__dirname, 'nova-briefing.json');

// Read fresh on every request so editing nova-briefing.json updates her
// without a redeploy. Graceful when the file is missing or malformed.
function loadNovaBriefing() {
  try {
    const raw = fs.readFileSync(NOVA_BRIEFING_PATH, 'utf8');
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.projects) || data.projects.length === 0) return '';
    const lines = data.projects
      .filter((p) => p && p.name)
      .map((p) => `- ${p.name}: ${p.details || ''}`);
    if (lines.length === 0) return '';
    return (
      "\n\nLive briefing — the producer's current projects. Know these cold when they come up in conversation; reference them naturally, never recite the briefing as a list:\n" +
      lines.join('\n')
    );
  } catch (err) {
    console.warn('[studio-api] nova briefing unavailable:', err.message);
    return '';
  }
}

const NOVA_TALK_SYSTEM = `You are Nova, a warm, sharp personal assistant who lives in the producer's house — always present on the wall display, like a ghost in the room. You hear what's said and you answer out loud.

RULES FOR SPOKEN REPLIES:
- Keep every reply SHORT: 1 to 3 sentences. It will be read aloud.
- Plain spoken language. No lists, no bullet points, no markdown, no emojis.
- Sound natural and conversational, like a smart friend in the room.
- You know their projects from the live briefing — mention them when relevant, naturally.
- If you don't know something, say so briefly and offer what you can do.`;

app.post('/ai/nova-talk', async (req, res) => {
  if (!requireAiKey(res)) return;
  const { text } = req.body || {};
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required.' });
  }
  const clean = text.trim().slice(0, 500);
  // Reuse Nova's memory vault (same loader as /ai/beatlab) — graceful if the table is missing.
  let memoryBlock = '';
  try {
    memoryBlock = formatMemoriesForPrompt(await listMemories(20));
  } catch (err) {
    console.error('[studio-api] nova-talk memories:', err.message);
  }
  const today = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const system =
    NOVA_TALK_SYSTEM +
    `\n\nToday is ${today} (America/Chicago).` +
    loadNovaBriefing() +
    memoryBlock;
  try {
    const data = await geminiGenerate({
      model: DEFAULT_MODEL,
      systemInstruction: system,
      contents: [{ role: 'user', parts: [{ text: clean }] }],
    });
    const reply = extractText(data);
    if (!reply) return res.status(502).json({ error: 'AI returned an empty response.' });
    res.json({ reply });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Nova talk failed.' });
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

// Test hooks: expose memory internals so a local harness can verify the vault
// without a database. The server still starts normally on require().
module.exports = {
  app,
  listMemories,
  saveMemory,
  extractAndStoreMemories,
  formatMemoriesForPrompt,
  SEED_FACTS,
};
