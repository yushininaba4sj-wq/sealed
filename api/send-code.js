/**
 * 確認コードを管理者メールへ送信（Vercel Serverless）
 * 環境変数: RESEND_API_KEY（Resend.com）
 * 任意: ADMIN_EMAIL（未設定時は yushininaba4sj@gmail.com）
 */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'yushininaba4sj@gmail.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, email, name, mode } = req.body || {};
  if (!code || !email) {
    return res.status(400).json({ error: 'code and email required' });
  }

  const subject =
    mode === 'signup'
      ? `Time Cap 新規登録コード: ${code}`
      : `Time Cap ログインコード: ${code}`;

  const html = `
    <div style="font-family:sans-serif;line-height:1.6;color:#111">
      <h2 style="margin:0 0 12px">Time Cap 確認コード</h2>
      <p style="font-size:28px;font-weight:700;letter-spacing:.2em;margin:16px 0">${code}</p>
      <p>操作: ${mode === 'signup' ? '新規登録' : 'ログイン'}</p>
      <p>ユーザー: ${name || '—'} &lt;${email}&gt;</p>
      <p style="color:#666;font-size:13px">10分以内にアプリへ入力してください。</p>
    </div>`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      ok: true,
      dev: true,
      message: 'RESEND_API_KEY not set — code not emailed',
    });
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Time Cap <onboarding@resend.dev>',
        to: [ADMIN_EMAIL],
        subject,
        html,
      }),
    });
    if (!r.ok) {
      const err = await r.text();
      return res.status(500).json({ error: 'send failed', detail: err });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
