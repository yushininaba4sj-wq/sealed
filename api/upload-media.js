import { requireAuth } from './_lib/auth.js';
import { blobEnabled, makePhotoPath, parseDataUrl, uploadBuffer } from './_lib/blob.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '8mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  if (!blobEnabled()) {
    return res.status(503).json({ ok: false, error: 'blob_unavailable' });
  }

  const session = requireAuth(req, res);
  if (!session) return;

  const body = req.body || {};
  let buffer;
  let contentType = 'image/jpeg';
  let ext = 'jpg';

  if (body.dataUrl) {
    const parsed = parseDataUrl(body.dataUrl);
    if (!parsed) return res.status(400).json({ error: 'invalid_data_url' });
    buffer = parsed.buffer;
    contentType = parsed.contentType;
    ext = parsed.ext;
  } else if (body.base64) {
    buffer = Buffer.from(String(body.base64), 'base64');
    contentType = body.contentType || 'image/jpeg';
    ext = body.ext || 'jpg';
  } else {
    return res.status(400).json({ error: 'missing_image' });
  }

  if (buffer.length > 8 * 1024 * 1024) {
    return res.status(413).json({ error: 'file_too_large' });
  }

  const pathname = makePhotoPath(session.userId, ext);
  const uploaded = await uploadBuffer(buffer, { pathname, contentType });
  if (uploaded.error) return res.status(502).json({ ok: false, error: uploaded.error });

  return res.status(200).json({
    ok: true,
    url: uploaded.url,
    mediaId: uploaded.mediaId,
    answerPhotoUrl: uploaded.url,
  });
}
