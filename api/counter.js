import crypto from 'node:crypto';

// Pages with a visitor counter
const COUNTERS = ['sandwich'];

// Max. new visitors per IP and day — keeps the number honest against
// cleared storage / incognito reloads, but allows a shared network
const MAX_NEW_VISITORS_PER_IP = 20;

const REDIS_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Upstash REST pipeline: [['SCARD', key], ...] → [result, ...]
async function redis(commands) {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Redis request failed: ${res.status}`);
  const out = await res.json();
  return out.map(r => {
    if (r.error) throw new Error(r.error);
    return r.result;
  });
}

// Raw IPs are never stored — only a keyed hash that can't be reversed
function ipHash(req) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  return crypto.createHmac('sha256', REDIS_TOKEN).update(ip).digest('hex').slice(0, 32);
}

const isVisitorId = v => typeof v === 'string' && /^[a-f0-9-]{36}$/.test(v);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(503).json({ error: 'Counter storage is not configured.' });
  }

  const input   = req.method === 'POST' ? (req.body || {}) : req.query;
  const page    = input.page;
  const visitor = input.visitor;

  if (!COUNTERS.includes(page)) return res.status(400).json({ error: 'Unknown counter.' });

  // Every browser is counted once: a set of anonymous visitor ids
  const visitorsKey = `counter:${page}:visitors`;

  try {
    if (req.method === 'GET') {
      const [count] = await redis([['SCARD', visitorsKey]]);
      return res.status(200).json({ count });
    }

    if (req.method === 'POST') {
      if (!isVisitorId(visitor)) return res.status(400).json({ error: 'Invalid visitor id.' });

      const [known] = await redis([['SISMEMBER', visitorsKey, visitor]]);
      if (!known) {
        const ipKey = `counter:${page}:ip:${ipHash(req)}`;
        const [used] = await redis([['INCR', ipKey], ['EXPIRE', ipKey, 86400, 'NX']]);
        // Over the limit: show the count, but don't add this visitor
        if (used <= MAX_NEW_VISITORS_PER_IP) await redis([['SADD', visitorsKey, visitor]]);
      }

      const [count] = await redis([['SCARD', visitorsKey]]);
      return res.status(200).json({ count });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (err) {
    return res.status(500).json({ error: 'Counter is unavailable right now.' });
  }
}
