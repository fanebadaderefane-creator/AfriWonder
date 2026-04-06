type DetectedFileKind =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/gif'
  | 'video/mp4'
  | 'video/quicktime'
  | 'audio/webm'
  | 'video/webm'
  | 'audio/ogg'
  | 'audio/wav'
  | 'application/pdf'
  | 'unknown';

function startsWithBytes(buf: Buffer, bytes: number[], offset = 0): boolean {
  if (!Buffer.isBuffer(buf) || buf.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i += 1) {
    if (buf[offset + i] !== bytes[i]) return false;
  }
  return true;
}

function asciiAt(buf: Buffer, start: number, length: number): string {
  if (!Buffer.isBuffer(buf) || buf.length < start + length) return '';
  return buf.subarray(start, start + length).toString('ascii');
}

export function detectFileSignature(buf: Buffer): DetectedFileKind {
  if (!Buffer.isBuffer(buf) || buf.length === 0) return 'unknown';

  if (startsWithBytes(buf, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWithBytes(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (asciiAt(buf, 0, 6) === 'GIF87a' || asciiAt(buf, 0, 6) === 'GIF89a') return 'image/gif';
  if (asciiAt(buf, 0, 4) === 'RIFF' && asciiAt(buf, 8, 4) === 'WEBP') return 'image/webp';
  if (asciiAt(buf, 0, 5) === '%PDF-') return 'application/pdf';
  if (asciiAt(buf, 0, 4) === 'OggS') return 'audio/ogg';
  if (asciiAt(buf, 0, 4) === 'RIFF' && asciiAt(buf, 8, 4) === 'WAVE') return 'audio/wav';
  if (startsWithBytes(buf, [0x1a, 0x45, 0xdf, 0xa3])) return 'video/webm';

  if (asciiAt(buf, 4, 4) === 'ftyp') {
    const brand = asciiAt(buf, 8, 4);
    if (brand === 'qt  ') return 'video/quicktime';
    return 'video/mp4';
  }

  return 'unknown';
}

export function fileSignatureMatchesMime(buffer: Buffer, mime: string): boolean {
  const normalizedMime = String(mime || '').toLowerCase().trim();
  const detected = detectFileSignature(buffer);

  if (detected === 'unknown') return false;
  if (normalizedMime === detected) return true;

  if (normalizedMime === 'audio/webm' && detected === 'video/webm') return true;
  if (normalizedMime === 'video/webm' && detected === 'video/webm') return true;
  if (normalizedMime === 'audio/ogg' && detected === 'audio/ogg') return true;

  return false;
}
