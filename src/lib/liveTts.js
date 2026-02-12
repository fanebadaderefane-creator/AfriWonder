/**
 * CDC: TTS optionnel pour lecture des messages dons à haute voix
 */
let synth = null;
let lastUtterance = null;

function getSynth() {
  if (typeof window === 'undefined') return null;
  if (!synth && window.speechSynthesis) synth = window.speechSynthesis;
  return synth;
}

export function speak(text, options = {}) {
  const s = getSynth();
  if (!s) return;
  if (lastUtterance) {
    s.cancel();
  }
  const ut = new SpeechSynthesisUtterance((text || '').slice(0, 200));
  ut.rate = options.rate ?? 0.9;
  ut.pitch = options.pitch ?? 1;
  ut.volume = options.volume ?? 1;
  ut.lang = options.lang || 'fr-FR';
  lastUtterance = ut;
  s.speak(ut);
}

export function cancelSpeak() {
  const s = getSynth();
  if (s) s.cancel();
  lastUtterance = null;
}

export function isTtsSupported() {
  return typeof window !== 'undefined' && !!window.speechSynthesis;
}
