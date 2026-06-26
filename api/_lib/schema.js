const PHOTO_SOURCES = new Set(['new', 'reuse', null]);
const MODES = new Set(['today', 'sealed']);

export function normalizePromptAnswer(raw, defaults = {}) {
  const userId = String(raw.userId || defaults.userId || '').trim();
  const date = String(raw.date || defaults.date || '').slice(0, 10);
  if (!userId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'invalid_user_or_date' };

  const answerPhotoUrl = raw.answerPhotoUrl ? String(raw.answerPhotoUrl) : null;
  const photoSource = raw.photoSource ?? (answerPhotoUrl ? 'new' : null);
  if (!PHOTO_SOURCES.has(photoSource)) return { error: 'invalid_photo_source' };

  const mode = raw.mode || 'today';
  if (!MODES.has(mode)) return { error: 'invalid_mode' };

  const answer = {
    id: String(raw.id || `pa_${userId}_${date}`),
    promptId: String(raw.promptId || 'night-reflect'),
    userId,
    groupId: String(raw.groupId || defaults.groupId || 'g1'),
    date,
    answerText: raw.answerText != null ? String(raw.answerText).slice(0, 500) : null,
    answerPhotoUrl,
    photoSource,
    reusedRecordId: raw.reusedRecordId ? String(raw.reusedRecordId) : null,
    mode,
    answeredAt: Number(raw.answeredAt || Date.now()),
    isLate: !!raw.isLate,
    resurfaceAt: raw.resurfaceAt ? String(raw.resurfaceAt) : null,
    canViewOthers: !!answerPhotoUrl,
  };

  return { answer };
}

export function redactFamilyAnswer(answer, viewerCanView) {
  if (!answer) return null;
  if (viewerCanView) return answer;
  return {
    id: answer.id,
    userId: answer.userId,
    date: answer.date,
    answeredAt: answer.answeredAt,
    hasPhoto: !!answer.answerPhotoUrl,
    locked: true,
    answerText: null,
    answerPhotoUrl: null,
  };
}
