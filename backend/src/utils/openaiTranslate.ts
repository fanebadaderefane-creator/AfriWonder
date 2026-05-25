import { logger } from './logger.js';

/**
 * Langues supportées par AfriWonder pour la traduction des transcriptions vocales.
 * Bambara/Wolof sont des langues low-resource — GPT-5.2 les gère raisonnablement.
 */
export const SUPPORTED_TRANSLATION_LANGUAGES = {
  fr: { code: 'fr', label: 'Français', native: 'Français' },
  en: { code: 'en', label: 'Anglais', native: 'English' },
  bm: { code: 'bm', label: 'Bambara', native: 'Bamanankan' },
  wo: { code: 'wo', label: 'Wolof', native: 'Wolof' },
} as const;

export type SupportedTranslationLang = keyof typeof SUPPORTED_TRANSLATION_LANGUAGES;

export function isSupportedTranslationLang(lang: string): lang is SupportedTranslationLang {
  return Object.prototype.hasOwnProperty.call(SUPPORTED_TRANSLATION_LANGUAGES, lang);
}

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const TRANSLATION_MODEL = 'gpt-5.2';

/**
 * Traduit un texte vers la langue cible en utilisant GPT-5.2.
 *
 * - Renvoie UNIQUEMENT le texte traduit (pas de préambule).
 * - Conserve les noms propres et expressions techniques tels quels.
 * - Pour Bambara/Wolof : utilise orthographe latine standard (NKo non supporté).
 */
export async function translateTextWithGPT(
  text: string,
  targetLang: SupportedTranslationLang,
  sourceLang?: SupportedTranslationLang
): Promise<{ text: string; sourceLang: string; targetLang: SupportedTranslationLang; model: string }> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    const err = new Error('Traduction non configurée (OPENAI_API_KEY)') as Error & { statusCode?: number };
    err.statusCode = 503;
    throw err;
  }
  const trimmed = text.trim();
  if (!trimmed) {
    const err = new Error('Texte vide à traduire') as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }
  if (trimmed.length > 4000) {
    const err = new Error('Texte trop long (4000 caractères max)') as Error & { statusCode?: number };
    err.statusCode = 413;
    throw err;
  }
  if (!isSupportedTranslationLang(targetLang)) {
    const err = new Error('Langue cible non supportée') as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }
  const targetMeta = SUPPORTED_TRANSLATION_LANGUAGES[targetLang];
  const sourceMeta = sourceLang && isSupportedTranslationLang(sourceLang)
    ? SUPPORTED_TRANSLATION_LANGUAGES[sourceLang]
    : null;

  const systemPrompt =
    `Tu es un traducteur professionnel spécialisé dans les langues d'Afrique de l'Ouest et européennes. ` +
    `Tu traduis vers ${targetMeta.native} (${targetMeta.label}). ` +
    (sourceMeta ? `La langue source est ${sourceMeta.native}. ` : `Détecte automatiquement la langue source. `) +
    `Règles strictes :\n` +
    `1. Renvoie UNIQUEMENT le texte traduit, sans préambule, guillemets ni explication.\n` +
    `2. Conserve les noms propres (personnes, villes, marques) tels quels.\n` +
    `3. Pour Bambara/Wolof : utilise l'orthographe latine standard (pas NKo).\n` +
    `4. Si le texte est déjà dans la langue cible, renvoie-le tel quel.\n` +
    `5. Garde le ton et le registre (familier, formel, etc.).`;

  const body = {
    model: TRANSLATION_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: trimmed },
    ],
    temperature: 0.2,
    max_completion_tokens: 1200,
  };

  const resp = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errTxt = await resp.text().catch(() => '');
    logger.warn('GPT translation failed', { status: resp.status, body: errTxt.slice(0, 240) });
    const err = new Error('Échec de la traduction') as Error & { statusCode?: number };
    err.statusCode = 502;
    throw err;
  }

  const json = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const translated = String(json?.choices?.[0]?.message?.content ?? '').trim().slice(0, 8000);
  if (!translated) {
    const err = new Error('Traduction vide') as Error & { statusCode?: number };
    err.statusCode = 502;
    throw err;
  }

  return {
    text: translated,
    sourceLang: sourceMeta?.code ?? 'auto',
    targetLang,
    model: TRANSLATION_MODEL,
  };
}
