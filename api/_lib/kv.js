const memory = new Map();

function hasUpstash() {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function upstash(path, method = 'GET', body) {
  const base = process.env.UPSTASH_REDIS_REST_URL.replace(/\/$/, '');
  const headers = { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` };
  const opts = { method, headers };
  if (body != null) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const r = await fetch(`${base}${path}`, opts);
  if (!r.ok) throw new Error(`kv_${r.status}`);
  return r.json();
}

export function kvEnabled() {
  return hasUpstash();
}

export async function kvGet(key) {
  if (!hasUpstash()) return memory.get(key) ?? null;
  const data = await upstash(`/get/${encodeURIComponent(key)}`);
  const raw = data?.result;
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return raw;
  }
}

export async function kvSet(key, value, ttlSec) {
  const serialized = JSON.stringify(value);
  if (!hasUpstash()) {
    memory.set(key, value);
    return true;
  }
  if (ttlSec) {
    await upstash('/set', 'POST', [key, serialized, { ex: ttlSec }]);
  } else {
    await upstash('/set', 'POST', [key, serialized]);
  }
  return true;
}

export async function kvDel(key) {
  if (!hasUpstash()) {
    memory.delete(key);
    return true;
  }
  await upstash(`/del/${encodeURIComponent(key)}`);
  return true;
}

export function answerKey(userId, date) {
  return `pa:${userId}:${date}`;
}

export function groupIndexKey(groupId, date) {
  return `pa:group:${groupId}:${date}`;
}
