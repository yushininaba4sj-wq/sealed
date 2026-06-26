import { createSession, verifyTicketCode } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ ok: false, error: 'mail_unavailable' });
  }

  const { ticket, code, userId, name } = req.body || {};
  if (!ticket || !code || !/^\d{6}$/.test(String(code))) {
    return res.status(400).json({ ok: false, error: 'invalid' });
  }

  const ticketData = verifyTicketCode(ticket, String(code));
  if (!ticketData) {
    return res.status(400).json({ ok: false, error: 'invalid' });
  }

  const uid = String(userId || '').trim();
  if (!uid) {
    return res.status(400).json({ ok: false, error: 'missing_user_id' });
  }

  const session = createSession({
    userId: uid,
    email: ticketData.email,
    name: name || '',
  });

  return res.status(200).json({
    ok: true,
    session,
    email: ticketData.email,
  });
}
