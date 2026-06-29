import { blobEnabled, blobGetJson, blobPutJson } from './blob.js';

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

function blobKvPath(key) {
  return `kv/${String(key).replace(/:/g, '/')}.json`;
}

export function kvEnabled() {
  return hasUpstash() || blobEnabled();
}

export async function kvGet(key) {
  if (hasUpstash()) {
    const data = await upstash(`/get/${encodeURIComponent(key)}`);
    const raw = data?.result;
    if (raw == null) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return raw;
    }
  }
  if (blobEnabled()) {
    const fromBlob = await blobGetJson(blobKvPath(key));
    if (fromBlob != null) return fromBlob;
  }
  return memory.get(key) ?? null;
}

export async function kvSet(key, value) {
  if (hasUpstash()) {
    const serialized = JSON.stringify(value);
    await upstash('/set', 'POST', [key, serialized]);
    return true;
  }
  if (blobEnabled()) {
    await blobPutJson(blobKvPath(key), value);
    memory.set(key, value);
    return true;
  }
  memory.set(key, value);
  return true;
}

export async function kvDel(key) {
  if (hasUpstash()) {
    await upstash(`/del/${encodeURIComponent(key)}`);
    return true;
  }
  memory.delete(key);
  return true;
}

export function answerKey(userId, date) {
  return `pa:${userId}:${date}`;
}

export function groupIndexKey(groupId, date) {
  return `pa:group:${groupId}:${date}`;
}
