import crypto from 'node:crypto';

// Polls that accept votes, with their number of options
const POLLS = { glasses: 5 };

// Max. distinct voters per IP and day — stops trivial ballot stuffing,
// but leaves room for a shared household / office network
const MAX_NEW_VOTERS_PER_IP = 10;

const REDIS_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Upstash REST pipeline: [['HGET', key, field], ...] → [result, ...]
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

function tally(values, optionCount) {
  const counts = Array(optionCount).fill(0);
  for (const v of values) {
    const i = Number(v);
    if (Number.isInteger(i) && i >= 0 && i < optionCount) counts[i]++;
  }
  return counts;
}

// Raw IPs are never stored — only a keyed hash that can't be reversed
function ipHash(req) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  return crypto.createHmac('sha256', REDIS_TOKEN).update(ip).digest('hex').slice(0, 32);
}

const isVoterId = v => typeof v === 'string' && /^[a-f0-9-]{36}$/.test(v);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(503).json({ error: 'Voting storage is not configured.' });
  }

  const input  = req.method === 'POST' ? (req.body || {}) : req.query;
  const poll   = input.poll;
  const voter  = input.voter;
  const optionCount = POLLS[poll];

  if (!optionCount)       return res.status(400).json({ error: 'Unknown poll.' });
  if (!isVoterId(voter))  return res.status(400).json({ error: 'Invalid voter id.' });

  const votesKey = `poll:${poll}:votes`;

  try {
    if (req.method === 'GET') {
      const [mine, values] = await redis([['HGET', votesKey, voter], ['HVALS', votesKey]]);
      // Results stay hidden until this voter has voted
      if (mine === null) return res.status(200).json({ vote: null });
      return res.status(200).json({ vote: Number(mine), counts: tally(values, optionCount) });
    }

    if (req.method === 'POST') {
      const option = Number(input.option);
      if (!Number.isInteger(option) || option < 0 || option >= optionCount) {
        return res.status(400).json({ error: 'Invalid option.' });
      }

      const [existing] = await redis([['HEXISTS', votesKey, voter]]);

      // Only first-time voters count towards the per-IP limit; changing a vote is free
      if (!existing) {
        const ipKey = `poll:${poll}:ip:${ipHash(req)}`;
        const [used] = await redis([['INCR', ipKey], ['EXPIRE', ipKey, 86400, 'NX']]);
        if (used > MAX_NEW_VOTERS_PER_IP) {
          return res.status(429).json({ error: 'Too many votes from this network today.' });
        }
      }

      const [, values] = await redis([['HSET', votesKey, voter, option], ['HVALS', votesKey]]);
      return res.status(200).json({ vote: option, counts: tally(values, optionCount) });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (err) {
    return res.status(500).json({ error: 'Voting is unavailable right now.' });
  }
}
