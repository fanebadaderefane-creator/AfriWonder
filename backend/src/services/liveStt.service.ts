/**
 * STT live hôte : transcription via OpenAI Whisper (clé serveur uniquement).
 */

export async function transcribeLiveAudioWhisper(audio: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error('STT indisponible : configurez OPENAI_API_KEY sur le backend.') as Error & {
      statusCode?: number;
    };
    err.statusCode = 503;
    throw err;
  }

  const mime = String(mimeType || '').toLowerCase();
  let filename = 'audio.m4a';
  if (mime.includes('webm')) filename = 'audio.webm';
  else if (mime.includes('wav')) filename = 'audio.wav';
  else if (mime.includes('mpeg') || mime.includes('mp3')) filename = 'audio.mp3';
  else if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) filename = 'audio.m4a';

  const model = process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() || 'whisper-1';
  const language = process.env.OPENAI_TRANSCRIPTION_LANG?.trim() || 'fr';

  const blob = new Blob([new Uint8Array(audio)], { type: mimeType || 'application/octet-stream' });
  const form = new FormData();
  form.append('file', blob, filename);
  form.append('model', model);
  form.append('language', language);

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const t = await res.text();
    const err = new Error(`Whisper HTTP ${res.status}: ${t.slice(0, 400)}`) as Error & { statusCode?: number };
    err.statusCode = res.status >= 500 ? 502 : 400;
    throw err;
  }

  const json = (await res.json().catch(() => null)) as { text?: string } | null;
  const text = typeof json?.text === 'string' ? json.text.trim() : '';
  return text;
}
