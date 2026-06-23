import crypto from 'crypto';

function verifyTicket(ticket, code, secret) {
  try {
    const { email, exp, mode, mac } = JSON.parse(Buffer.from(ticket, 'base64url').toString());
    if (!email || !exp || !mode || !mac) return false;
    if (Date.now() > exp) return false;
    const expected = crypto.createHmac('sha256', secret).update(`${email}|${code}|${exp}|${mode}`).digest('hex');
    if (mac.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected));
  } catch (e) {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ ok: false, error: 'mail_unavailable' });
  }

  const { ticket, code } = req.body || {};
  if (!ticket || !code || !/^\d{6}$/.test(String(code))) {
    return res.status(400).json({ ok: false, error: 'invalid' });
  }

  if (!verifyTicket(ticket, String(code), apiKey)) {
    return res.status(400).json({ ok: false, error: 'invalid' });
  }

  return res.status(200).json({ ok: true });
}
