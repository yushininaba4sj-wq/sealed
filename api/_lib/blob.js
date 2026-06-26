import crypto from 'crypto';

export function blobEnabled() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export async function uploadBuffer(buffer, { pathname, contentType }) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return { error: 'blob_unavailable' };

  const safePath = pathname.replace(/[^a-zA-Z0-9._/-]/g, '_');
  const r = await fetch(`https://blob.vercel-storage.com/${safePath}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`,
      'x-content-type': contentType || 'application/octet-stream',
      'x-add-random-suffix': '0',
    },
    body: buffer,
  });

  if (!r.ok) return { error: 'upload_failed' };
  const data = await r.json();
  return {
    url: data.url,
    pathname: data.pathname || safePath,
    mediaId: data.url,
  };
}

export function makePhotoPath(userId, ext = 'jpg') {
  const stamp = Date.now();
  const rand = crypto.randomBytes(4).toString('hex');
  return `reflect/${userId}/${stamp}_${rand}.${ext}`;
}

export function parseDataUrl(dataUrl) {
  const m = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return {
    contentType: m[1],
    buffer: Buffer.from(m[2], 'base64'),
    ext: m[1].includes('png') ? 'png' : m[1].includes('webp') ? 'webp' : 'jpg',
  };
}
