import crypto from 'crypto';

export function blobEnabled() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

function blobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

export async function uploadBuffer(buffer, { pathname, contentType }) {
  const token = blobToken();
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

export async function blobGetJson(pathname) {
  const token = blobToken();
  if (!token) return null;
  const safePath = pathname.replace(/[^a-zA-Z0-9._/-]/g, '_');
  try {
    const r = await fetch(`https://blob.vercel-storage.com/${safePath}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (r.status === 404) return null;
    if (!r.ok) return null;
    const text = await r.text();
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

export async function blobPutJson(pathname, value) {
  const token = blobToken();
  if (!token) throw new Error('blob_unavailable');
  const safePath = pathname.replace(/[^a-zA-Z0-9._/-]/g, '_');
  const body = JSON.stringify(value);
  const r = await fetch(`https://blob.vercel-storage.com/${safePath}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`,
      'x-content-type': 'application/json',
      'x-add-random-suffix': '0',
    },
    body,
  });
  if (!r.ok) throw new Error('blob_put_failed');
  return r.json();
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
