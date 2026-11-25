// 좋아요 수를 Upstash Redis(Vercel Marketplace)에 저장하는 서버 함수
// Vercel 프로젝트에 Upstash for Redis를 연결하면 아래 환경 변수가 자동으로 생깁니다.
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'stamp-likes';
// 전시된 스탬프 id만 받습니다 (임의의 값이 저장되지 않도록)
const IDS = new Set(["28e5d381", "b79b9032", "437aa5f2", "f0fc0a64", "5d08ffa2", "e56a36da", "d9ac336e", "8e3b7a45", "4cdbcdfd", "31b59d49", "c4ae00bf", "7e7b8c09", "ba754360", "cd999f91", "47f0f56c", "c5ef4930", "aaaa8fcf", "210c91f3", "4cec10eb", "ea24846b", "effc148c", "a25c35bc", "589f0a32", "05210966", "72d53530", "f162a5ad", "67ee9174", "2676a6f9", "1073a457", "731031b8", "c65909ca", "b35b61e8", "63a0350e", "b3a0194e", "9544d5e2", "c9217db9", "8cec0ab8", "604015dd", "850dbde4", "4360c5f8", "49497dcd", "4e191fd4", "5a856f78", "9930a506", "99c64668", "d4a2b535", "9537d971", "e2a8d129", "374f0e42", "035b558b", "0bf37b66", "35b9e9d1", "a83bc29b", "dabc68b7", "b5598ebd", "859666b8", "f8b5d5d5", "5452325c", "a87e67e4", "3d14a4b8", "a0c509ac", "ac0d2622", "2d8c7294", "c0432dfd", "81dc2b2a", "0a44fa17", "fa791eb4", "c09e1c4b", "1c4f2c18", "4d161e25", "e196b41d", "32f1bdc0", "82db8497", "c14f1db1", "86135a87", "53daf54b", "13daefbd", "d0ac7786", "f433beac", "2faecf9b", "a933a4a0", "bb3a9da4", "211d5021", "e8ee2b12"]);

async function redis(command) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!r.ok) throw new Error('redis ' + r.status);
  return (await r.json()).result;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!REDIS_URL || !REDIS_TOKEN) return res.status(503).json({ error: 'storage not configured' });
  try {
    if (req.method === 'GET') {
      const flat = (await redis(['HGETALL', KEY])) || [];
      const likes = {};
      for (let i = 0; i < flat.length; i += 2) likes[flat[i]] = Math.max(0, parseInt(flat[i + 1], 10) || 0);
      return res.status(200).json({ likes });
    }
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body || '{}');
      const id = String((body && body.id) || '');
      const delta = body && body.delta === -1 ? -1 : 1;
      if (!IDS.has(id)) return res.status(400).json({ error: 'unknown stamp' });
      let n = await redis(['HINCRBY', KEY, id, delta]);
      if (n < 0) { await redis(['HSET', KEY, id, 0]); n = 0; }
      return res.status(200).json({ id, likes: n });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'server error' });
  }
};
