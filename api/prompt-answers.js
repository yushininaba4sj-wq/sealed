import { requireAuth } from './_lib/auth.js';
import { answerKey, groupIndexKey, kvEnabled, kvGet, kvSet } from './_lib/kv.js';
import { normalizePromptAnswer, redactFamilyAnswer } from './_lib/schema.js';

async function loadAnswer(userId, date) {
  return kvGet(answerKey(userId, date));
}

async function saveAnswer(answer) {
  await kvSet(answerKey(answer.userId, answer.date), answer);
  const index = (await kvGet(groupIndexKey(answer.groupId, answer.date))) || [];
  if (!index.includes(answer.userId)) {
    index.push(answer.userId);
    await kvSet(groupIndexKey(answer.groupId, answer.date), index);
  }
  return answer;
}

export default async function handler(req, res) {
  if (!kvEnabled()) {
    return res.status(503).json({ ok: false, error: 'kv_unavailable' });
  }

  if (req.method === 'GET') {
    const session = requireAuth(req, res);
    if (!session) return;

    const date = String(req.query?.date || '').slice(0, 10);
    const groupId = String(req.query?.groupId || 'g1');
    const memberIds = String(req.query?.memberIds || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'invalid_date' });
    }

    const mine = await loadAnswer(session.userId, date);
    const viewerCanView = !!(mine?.answerPhotoUrl);
    const ids = memberIds.length ? memberIds : (await kvGet(groupIndexKey(groupId, date))) || [];
    const family = [];
    for (const uid of ids) {
      if (uid === session.userId) continue;
      const ans = await loadAnswer(uid, date);
      if (ans) family.push(redactFamilyAnswer(ans, viewerCanView));
    }

    return res.status(200).json({
      ok: true,
      date,
      groupId,
      mine,
      family: family.filter(Boolean),
      canViewOthers: viewerCanView,
    });
  }

  if (req.method === 'POST') {
    const session = requireAuth(req, res);
    if (!session) return;

    const body = req.body || {};
    const { answer, error } = normalizePromptAnswer(
      { ...body, userId: session.userId },
      { groupId: body.groupId || 'g1' },
    );
    if (error) return res.status(400).json({ error });

    const saved = await saveAnswer(answer);
    return res.status(200).json({ ok: true, answer: saved });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'method_not_allowed' });
}
