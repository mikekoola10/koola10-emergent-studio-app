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
  try {
    const data = await geminiGenerate({
      model: DEFAULT_MODEL,
      systemInstruction: BEATLAB_SYSTEM,
      contents: geminiContentsFromMessages(messages),
    });
    const text = extractText(data);
    if (!text) return res.status(502).json({ error: 'AI returned an empty response.' });
    res.json({ response: text, model: DEFAULT_MODEL });
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
