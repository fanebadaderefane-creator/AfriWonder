import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { translateLimiter } from '../middleware/rateLimiting.js';
import { logger } from '../utils/logger.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

const MAX_CHARS = 4500;
const ALLOWED_TARGETS = new Set(['fr', 'en']);

/** Codes LibreTranslate / detect → codes MyMemory (ISO 639-1 quand possible). */
function toMyMemorySourceCode(lang: string): string {
  const x = String(lang || '')
    .trim()
    .toLowerCase()
    .replace('_', '-');
  if (!x || x === 'auto') return 'auto';
  const two = x.split('-')[0];
  const map: Record<string, string> = {
    zh: 'zh-CN',
    'zh-cn': 'zh-CN',
    'zh-tw': 'zh-TW',
    pt: 'pt-PT',
    'pt-br': 'pt-BR',
    nb: 'no',
    nn: 'no',
  };
  return map[x] ?? map[two] ?? two;
}

/**
 * Détection de langue via la même instance LibreTranslate que la traduction.
 * Évite les erreurs MyMemory (TM) quand la paire source|cible est fausse.
 */
async function detectLibreTranslate(text: string): Promise<string | null> {
  const base = (process.env.LIBRETRANSLATE_URL || 'https://libretranslate.de').replace(/\/$/, '');
  const apiKey = process.env.LIBRETRANSLATE_API_KEY || '';
  try {
    const body: Record<string, string> = { q: text };
    if (apiKey) body.api_key = apiKey;
    const res = await fetch(`${base}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      logger.warn('[translate] LibreTranslate /detect HTTP error', { status: res.status, base });
      return null;
    }
    const data = (await res.json()) as Array<{ language?: string; confidence?: number }> | { error?: string };
    if (data && typeof data === 'object' && !Array.isArray(data) && (data as { error?: string }).error) {
      logger.warn('[translate] LibreTranslate /detect API error', { error: (data as { error: string }).error });
      return null;
    }
    const arr = Array.isArray(data) ? data : [];
    const best = arr[0];
    const lang = typeof best?.language === 'string' ? best.language.trim().toLowerCase() : '';
    if (!lang) return null;
    const conf = typeof best?.confidence === 'number' ? best.confidence : 0;
    // Libre renvoie souvent une confiance 0–1 ou 0–100 selon les instances
    const confNorm = conf > 1 ? conf / 100 : conf;
    if (confNorm < 0.12 && text.trim().length > 8) return null;
    return lang;
  } catch (err) {
    logger.warn('[translate] LibreTranslate /detect failed', { err: (err as Error)?.message });
    return null;
  }
}

/** Rejette les « traductions » TM absurdes (ex. « hi » → paragraphe sur le sol). */
function isLikelyCorruptTranslation(source: string, translated: string): boolean {
  const s = source.trim();
  const t = translated.trim();
  if (!s || !t) return false;
  if (s.toLowerCase() === t.toLowerCase()) return false;
  const short = s.length <= 14 || s.split(/\s+/).filter(Boolean).length <= 2;
  if (short && t.length >= 48) return true;
  if (s.length <= 6 && t.length > s.length * 12) return true;
  return false;
}

async function translateLibre(text: string, source: string, target: string): Promise<string | null> {
  const base = (process.env.LIBRETRANSLATE_URL || 'https://libretranslate.de').replace(/\/$/, '');
  const apiKey = process.env.LIBRETRANSLATE_API_KEY || '';
  try {
    const body: Record<string, string> = {
      q: text,
      target,
      format: 'text',
    };
    if (source && source !== 'auto') {
      body.source = source;
    } else {
      body.source = 'auto';
    }
    if (apiKey) body.api_key = apiKey;

    const res = await fetch(`${base}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      logger.warn('[translate] LibreTranslate HTTP error', { status: res.status, base });
      return null;
    }
    const data = (await res.json()) as { translatedText?: string; error?: string };
    if (data?.error) {
      logger.warn('[translate] LibreTranslate API error', { error: data.error });
      return null;
    }
    const out = data?.translatedText;
    return typeof out === 'string' && out.trim() ? out.trim() : null;
  } catch (err) {
    logger.warn('[translate] LibreTranslate fetch failed', { err: (err as Error)?.message });
    return null;
  }
}

/**
 * Repli MyMemory : ordre = langue détectée|cible, puis auto|cible, puis paires courantes.
 * Filtre les hits TM manifestement faux sur textes courts.
 */
async function translateMyMemory(
  text: string,
  target: string,
  detectedSource: string | null
): Promise<string | null> {
  const chunk = text.slice(0, 500);
  const srcMy = detectedSource ? toMyMemorySourceCode(detectedSource) : null;

  const pairs: string[] = [];
  if (srcMy && srcMy !== 'auto' && srcMy.split('-')[0] !== target) {
    pairs.push(`${srcMy}|${target}`);
  }
  pairs.push(`auto|${target}`);
  if (target === 'fr') {
    pairs.push('en|fr', 'es|fr', 'de|fr', 'it|fr');
  } else {
    pairs.push('fr|en', 'es|en', 'de|en', 'it|en');
  }

  const seen = new Set<string>();
  for (const langpair of pairs) {
    if (seen.has(langpair)) continue;
    seen.add(langpair);
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${encodeURIComponent(langpair)}&mt=1`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = (await res.json()) as {
        responseData?: { translatedText?: string };
        responseStatus?: number;
      };
      if (data.responseStatus === 429) continue;
      const t = data.responseData?.translatedText;
      if (typeof t !== 'string' || !t.trim() || t.trim() === chunk.trim()) continue;
      const out = t.trim();
      if (isLikelyCorruptTranslation(chunk, out)) continue;
      return out;
    } catch {
      /* next pair */
    }
  }
  return null;
}

router.post('/', authenticate, translateLimiter, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    let rawTarget = String(req.body?.target || 'fr').toLowerCase();
    if (rawTarget === 'bm') rawTarget = 'fr';
    if (!ALLOWED_TARGETS.has(rawTarget)) {
      return res.status(400).json({ success: false, error: 'Langue cible non supportée (fr, en).' });
    }
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text) {
      return res.status(400).json({ success: false, error: 'Texte vide' });
    }
    if (text.length > MAX_CHARS) {
      return res.status(400).json({
        success: false,
        error: `Texte trop long (maximum ${MAX_CHARS} caractères).`,
      });
    }

    const sourceRaw =
      typeof req.body?.source === 'string' && req.body.source.trim() ? req.body.source.trim() : 'auto';
    const source = sourceRaw.toLowerCase() === 'auto' ? 'auto' : sourceRaw.toLowerCase();

    let detected: string | null = null;

    if (source === 'auto') {
      detected = await detectLibreTranslate(text);
      const base = detected?.split('-')[0];
      if (base && base === rawTarget) {
        return res.json({
          success: true,
          data: {
            translatedText: text,
            target: rawTarget,
            detectedSource: detected,
          },
        });
      }
    }

    const effectiveSource =
      source === 'auto' ? (detected && detected.length > 0 ? detected : 'auto') : source;

    let translated = await translateLibre(text, effectiveSource, rawTarget);

    if (!translated && source === 'auto' && effectiveSource !== 'auto') {
      translated = await translateLibre(text, 'auto', rawTarget);
    }

    if (!translated) {
      const memSource = source === 'auto' ? detected : source;
      translated = await translateMyMemory(text, rawTarget, memSource);
    }
    if (!translated) {
      return res.status(502).json({
        success: false,
        error:
          'Service de traduction indisponible. Réessayez plus tard ou configurez LIBRETRANSLATE_URL sur le serveur.',
      });
    }

    res.json({
      success: true,
      data: {
        translatedText: translated,
        target: rawTarget,
        ...(source === 'auto' && detected ? { detectedSource: detected } : {}),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
