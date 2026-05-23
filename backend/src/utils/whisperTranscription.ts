import { logger } from './logger.js';

/** Transcription via OpenAI Whisper (OPENAI_API_KEY). */
export async function transcribeBufferWithWhisper(
  buf: Buffer,
  options: { filename?: string; mime?: string } = {}
): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    const err = new Error('Transcription non configurée (OPENAI_API_KEY)') as Error & { statusCode?: number };
    err.statusCode = 503;
    throw err;
  }
  const filename = options.filename || 'audio.webm';
  const mime = options.mime || 'audio/webm';

  const fd = new FormData();
  fd.append('model', 'whisper-1');
  fd.append('file', new Blob([buf], { type: mime }), filename);

  const tr = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
  });
  if (!tr.ok) {
    const errTxt = await tr.text();
    logger.warn('OpenAI transcription failed', { status: tr.status, body: errTxt.slice(0, 240) });
    const err = new Error('Échec de la transcription') as Error & { statusCode?: number };
    err.statusCode = 502;
    throw err;
  }
  const json = (await tr.json()) as { text?: string };
  const text = String(json?.text ?? '').trim().slice(0, 8000);
  if (!text) {
    const err = new Error('Transcription vide') as Error & { statusCode?: number };
    err.statusCode = 502;
    throw err;
  }
  return text;
}
