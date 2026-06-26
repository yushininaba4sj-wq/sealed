import crypto from 'crypto';

function secret() {
  return process.env.API_SESSION_SECRET || process.env.RESEND_API_KEY || 'timecap-dev-secret';
}

export function createSession({ userId, email, name, expMs = 30 * 864e5 }) {
  const exp = Date.now() + expMs;
  const payload = Buffer.from(JSON.stringify({ userId, email, name: name || '', exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySession(token) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  try {
    if (sig.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.userId || !data.exp || Date.now() > data.exp) return null;
    return data;
  } catch (e) {
    return null;
  }
}

export function readAuth(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  return verifySession(token);
}

export function requireAuth(req, res) {
  const session = readAuth(req);
  if (!session) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
  return session;
}

export function decodeTicket(ticket) {
  try {
    return JSON.parse(Buffer.from(ticket, 'base64url').toString());
  } catch (e) {
    return null;
  }
}

export function verifyTicketCode(ticket, code) {
  const data = decodeTicket(ticket);
  if (!data?.email || !data?.exp || !data?.mode || !data?.mac) return null;
  if (Date.now() > data.exp) return null;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const expected = crypto
    .createHmac('sha256', key)
    .update(`${data.email}|${code}|${data.exp}|${data.mode}`)
    .digest('hex');
  if (data.mac.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(data.mac), Buffer.from(expected))) return null;
  return data;
}
