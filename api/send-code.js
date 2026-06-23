import crypto from 'crypto';

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function makeTicket(email, code, exp, mode, secret) {
  const mac = crypto.createHmac('sha256', secret).update(`${email}|${code}|${exp}|${mode}`).digest('hex');
  return Buffer.from(JSON.stringify({ email, exp, mode, mac })).toString('base64url');
}

function maskEmail(email) {
  const [local, domain] = String(email).split('@');
  if (!domain) return '***';
  const shown = local.length <= 2 ? local[0] + '*' : local[0] + '***' + local.slice(-1);
  return `${shown}@${domain}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name, mode } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'invalid email' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ ok: false, error: 'mail_unavailable' });
  }

  const code = generateOtp();
  const exp = Date.now() + 600000;
  const ticket = makeTicket(email, code, exp, mode || 'login', apiKey);

  const subject = mode === 'signup' ? 'Time Cap 登録確認コード' : 'Time Cap ログイン確認コード';
  const html = `
    <div style="font-family:sans-serif;line-height:1.6;color:#111">
      <h2 style="margin:0 0 12px">Time Cap</h2>
      <p>確認コード:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:.2em;margin:16px 0">${code}</p>
      <p style="color:#666;font-size:13px">10分以内に入力してください。心当たりがない場合は無視してください。</p>
    </div>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Time Cap <onboarding@resend.dev>',
        to: [email],
        subject,
        html,
      }),
    });
    if (!r.ok) {
      return res.status(502).json({ ok: false, error: 'send_failed' });
    }
    return res.status(200).json({ ok: true, ticket, mask: maskEmail(email) });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'send_failed' });
  }
}
