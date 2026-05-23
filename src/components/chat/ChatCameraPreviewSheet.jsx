// AfriWonder — Prévisualisation média type WhatsApp (légende, filtres, outils, vue unique)
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Download,
  Sparkles,
  Type,
  PenLine,
  Send,
  Crop,
  Sticker,
  ChevronUp,
  ChevronDown,
  ImagePlus,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const FILTER_PRESETS = [
  { key: 'none', label: 'Normal', css: 'none' },
  { key: 'bw', label: 'N&B', css: 'grayscale(1)' },
  { key: 'sepia', label: 'Sépia', css: 'sepia(0.5) contrast(1.05)' },
  { key: 'vivid', label: 'Vif', css: 'saturate(1.4) contrast(1.08)' },
  { key: 'cool', label: 'Froid', css: 'saturate(1.05) hue-rotate(-15deg)' },
  { key: 'warm', label: 'Chaud', css: 'saturate(1.1) sepia(0.15)' },
];

const QUICK_STICKERS = ['😀', '❤️', '🔥', '👍', '😂', '🎉', '✨', '👏'];

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Compose l'image finale (rotation, filtre, dessins, stickers, texte) pour l'upload.
 */
async function composeImageBlob({
  previewUrl,
  rotationDeg,
  filterCss,
  hd,
  strokes,
  stickerPlacements,
  overlayText,
}) {
  const img = await loadImage(previewUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const rad = (rotationDeg * Math.PI) / 180;
  const rw = rotationDeg % 180 === 0 ? w : h;
  const rh = rotationDeg % 180 === 0 ? h : w;

  const canvas = document.createElement('canvas');
  canvas.width = rw;
  canvas.height = rh;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.translate(rw / 2, rh / 2);
  ctx.rotate(rad);
  ctx.filter = filterCss && filterCss !== 'none' ? filterCss : 'none';
  ctx.drawImage(img, -w / 2, -h / 2);
  ctx.filter = 'none';
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const scaleX = rw;
  const scaleY = rh;

  if (strokes?.length) {
    strokes.forEach((stroke) => {
      if (!stroke.points?.length) return;
      ctx.strokeStyle = stroke.color || '#ffffff';
      ctx.lineWidth = Math.max(2, (stroke.width || 0.004) * Math.min(rw, rh));
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      stroke.points.forEach((p, i) => {
        const px = p.x * scaleX;
        const py = p.y * scaleY;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    });
  }

  if (stickerPlacements?.length) {
    const fontSize = Math.round(Math.min(rw, rh) * 0.12);
    ctx.font = `${fontSize}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    stickerPlacements.forEach((s) => {
      ctx.fillText(s.emoji, s.x * rw, s.y * rh);
    });
  }

  if (overlayText?.trim()) {
    const pad = Math.round(rh * 0.04);
    const fs = Math.round(Math.min(rw, rh) * 0.045);
    ctx.font = `600 ${fs}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = Math.max(2, fs * 0.12);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const tx = rw / 2;
    const ty = rh - pad;
    ctx.strokeText(overlayText.trim(), tx, ty);
    ctx.fillText(overlayText.trim(), tx, ty);
  }

  const quality = hd ? 0.92 : 0.72;
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}

export function ChatCameraPreviewSheet({
  open,
  draft,
  onClose,
  onCaptionChange,
  onSend,
  sending = false,
  labels = {},
  recipientName = '',
  onAddMoreMedia,
  /** Si le mode éphémère global du chat est actif, le bouton « 1 » est pré-coché à l’ouverture. */
  ephemeralActive = false,
}) {
  const imgRef = useRef(null);
  const wrapRef = useRef(null);
  const drawCanvasRef = useRef(null);

  const [hd, setHd] = useState(true);
  const [rotationIdx, setRotationIdx] = useState(0);
  const rotationDeg = rotationIdx * 90;
  const [filterKey, setFilterKey] = useState('none');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewOnce, setViewOnce] = useState(false);
  const [overlayText, setOverlayText] = useState('');
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [textDraft, setTextDraft] = useState('');
  const [drawMode, setDrawMode] = useState(false);
  const [stickerMode, setStickerMode] = useState(false);
  const [pickedSticker, setPickedSticker] = useState(null);
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [stickerPlacements, setStickerPlacements] = useState([]);

  const filterCss = useMemo(
    () => FILTER_PRESETS.find((f) => f.key === filterKey)?.css || 'none',
    [filterKey]
  );

  useEffect(() => {
    if (!open) {
      setHd(true);
      setRotationIdx(0);
      setFilterKey('none');
      setFiltersOpen(false);
      setViewOnce(false);
      setOverlayText('');
      setTextDialogOpen(false);
      setTextDraft('');
      setDrawMode(false);
      setStickerMode(false);
      setPickedSticker(null);
      setStrokes([]);
      setCurrentStroke(null);
      setStickerPlacements([]);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setViewOnce(!!ephemeralActive);
    }
  }, [open, ephemeralActive]);

  const isVideo = !!draft?.isVideo;

  const getUvFromEvent = useCallback((e) => {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    return { x, y };
  }, []);

  const syncDrawCanvasSize = useCallback(() => {
    const img = imgRef.current;
    const c = drawCanvasRef.current;
    if (!img || !c) return;
    const rect = img.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    c.style.width = `${rect.width}px`;
    c.style.height = `${rect.height}px`;
    c.width = Math.max(1, Math.floor(rect.width * dpr));
    c.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    strokes.forEach((stroke) => {
      if (!stroke.points?.length) return;
      ctx.strokeStyle = stroke.color || '#ffffff';
      ctx.lineWidth = Math.max(2, (stroke.width || 0.004) * Math.min(rect.width, rect.height));
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      stroke.points.forEach((p, i) => {
        const px = p.x * rect.width;
        const py = p.y * rect.height;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    });
    if (currentStroke?.points?.length) {
      ctx.strokeStyle = currentStroke.color || '#ffffff';
      ctx.lineWidth = Math.max(2, (currentStroke.width || 0.004) * Math.min(rect.width, rect.height));
      ctx.lineCap = 'round';
      ctx.beginPath();
      currentStroke.points.forEach((p, i) => {
        const px = p.x * rect.width;
        const py = p.y * rect.height;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
  }, [strokes, currentStroke]);

  useEffect(() => {
    if (!open || isVideo) return;
    const t = window.setTimeout(syncDrawCanvasSize, 80);
    window.addEventListener('resize', syncDrawCanvasSize);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', syncDrawCanvasSize);
    };
  }, [open, isVideo, draft?.previewUrl, syncDrawCanvasSize]);

  useEffect(() => {
    syncDrawCanvasSize();
  }, [strokes, currentStroke, syncDrawCanvasSize, filtersOpen]);

  const onPointerDown = (e) => {
    if (!drawMode || isVideo) return;
    e.preventDefault();
    const uv = getUvFromEvent(e);
    if (!uv) return;
    setCurrentStroke({
      points: [uv],
      color: '#ffffff',
      width: 0.004,
    });
  };

  const onPointerMove = (e) => {
    if (!drawMode || !currentStroke) return;
    const uv = getUvFromEvent(e);
    if (!uv) return;
    setCurrentStroke((s) => (s ? { ...s, points: [...s.points, uv] } : s));
  };

  const onPointerUp = () => {
    if (!currentStroke) return;
    if (currentStroke.points.length > 1) {
      setStrokes((prev) => [...prev, currentStroke]);
    }
    setCurrentStroke(null);
  };

  const onImageClick = (e) => {
    if (!stickerMode || !pickedSticker || isVideo) return;
    const uv = getUvFromEvent(e);
    if (!uv) return;
    setStickerPlacements((prev) => [...prev, { emoji: pickedSticker, ...uv }]);
    setStickerMode(false);
    setPickedSticker(null);
  };

  const handleSendClick = async () => {
    if (!draft) return;
    const caption = String(draft.caption || '').trim();
    const is_ephemeral = viewOnce;

    if (isVideo) {
      onSend?.({
        blob: draft.blob,
        mimeType: draft.mimeType,
        isVideo: true,
        caption,
        is_ephemeral,
      });
      return;
    }

    const needsCompose =
      rotationDeg !== 0 ||
      filterKey !== 'none' ||
      strokes.length > 0 ||
      stickerPlacements.length > 0 ||
      overlayText.trim().length > 0;

    let outBlob = draft.blob;
    if (needsCompose) {
      const composed = await composeImageBlob({
        previewUrl: draft.previewUrl,
        rotationDeg,
        filterCss,
        hd,
        strokes,
        stickerPlacements,
        overlayText,
      });
      if (composed) outBlob = composed;
    } else if (!hd && draft.blob) {
      const composed = await composeImageBlob({
        previewUrl: draft.previewUrl,
        rotationDeg: 0,
        filterCss: 'none',
        hd: false,
        strokes: [],
        stickerPlacements: [],
        overlayText: '',
      });
      if (composed) outBlob = composed;
    }

    const outMime = needsCompose || !hd ? 'image/jpeg' : draft.mimeType || 'image/jpeg';

    onSend?.({
      blob: outBlob,
      mimeType: outMime,
      isVideo: false,
      caption,
      is_ephemeral,
    });
  };

  if (!open || !draft) return null;

  return (
    <div
      className="fixed inset-0 z-[220] flex flex-col bg-black"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      role="dialog"
      aria-modal="true"
      aria-label={labels.previewTitle ?? 'Prévisualisation'}
    >
      {/* Barre du haut type WhatsApp */}
      <div className="relative z-30 flex items-center gap-1.5 px-2 pt-2 sm:gap-2 sm:px-3 sm:pt-3">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/65"
          onClick={onClose}
          aria-label={labels.close ?? 'Fermer'}
        >
          <X className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/65"
          aria-label={labels.download ?? 'Télécharger'}
          onClick={() => {
            try {
              const a = document.createElement('a');
              a.href = draft.previewUrl;
              a.download = draft.isVideo ? `video_${Date.now()}.webm` : `photo_${Date.now()}.jpg`;
              a.click();
            } catch (_) {}
          }}
        >
          <Download className="h-5 w-5" />
        </button>
        {!isVideo && (
          <>
            <button
              type="button"
              onClick={() => setHd((p) => !p)}
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full backdrop-blur-md',
                hd ? 'bg-white/20 text-white' : 'bg-black/50 text-white/70 hover:bg-black/65'
              )}
              aria-label={labels.hdToggle ?? 'Qualité HD'}
              title={hd ? (labels.hdOn ?? 'HD activé') : (labels.hdOff ?? 'HD désactivé')}
            >
              <span className="text-[11px] font-bold tracking-tight">HD</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRotationIdx((i) => (i + 1) % 4);
                setDrawMode(false);
                setStickerMode(false);
              }}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/65"
              aria-label={labels.rotate ?? 'Pivoter'}
              title={`${rotationDeg}°`}
            >
              <Crop className="h-5 w-5" />
              {rotationIdx > 0 && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-emerald-600 px-0.5 text-[9px] font-bold">
                  {rotationDeg}°
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setFiltersOpen((p) => !p)}
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full backdrop-blur-md',
                filtersOpen ? 'bg-white/20 text-white ring-1 ring-white/35' : 'bg-black/50 text-white hover:bg-black/65'
              )}
              aria-label={labels.effects ?? 'Filtres'}
            >
              <Sparkles className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setStickerMode((p) => !p);
                setDrawMode(false);
                setFiltersOpen(false);
              }}
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full backdrop-blur-md',
                stickerMode ? 'bg-emerald-500/35 text-white ring-1 ring-emerald-400/50' : 'bg-black/50 text-white hover:bg-black/65'
              )}
              aria-label={labels.stickers ?? 'Stickers'}
            >
              <Sticker className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setTextDraft(overlayText);
                setTextDialogOpen(true);
                setDrawMode(false);
                setStickerMode(false);
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/65"
              aria-label={labels.addText ?? 'Texte'}
            >
              <Type className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setDrawMode((p) => !p);
                setStickerMode(false);
                setFiltersOpen(false);
              }}
              className={cn(
                'ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full backdrop-blur-md sm:ml-0',
                drawMode ? 'bg-emerald-500/35 text-white ring-1 ring-emerald-400/50' : 'bg-black/50 text-white hover:bg-black/65'
              )}
              aria-label={labels.draw ?? 'Dessiner'}
            >
              <PenLine className="h-5 w-5" />
            </button>
          </>
        )}
        {isVideo && (
          <div className="ml-auto text-xs text-white/45">{labels.videoPreviewHint ?? 'Vidéo — légende et envoi'}</div>
        )}
      </div>

      {/* Bandeau stickers */}
      {!isVideo && stickerMode && (
        <div className="relative z-30 flex items-center gap-2 overflow-x-auto px-3 py-2 scrollbar-none">
          <span className="shrink-0 text-[11px] text-white/55">{labels.pickSticker ?? 'Choisir puis toucher la photo'}</span>
          {QUICK_STICKERS.map((em) => (
            <button
              key={em}
              type="button"
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl',
                pickedSticker === em ? 'bg-white/20 ring-1 ring-white/40' : 'bg-white/10 hover:bg-white/15'
              )}
              onClick={() => setPickedSticker(em)}
            >
              {em}
            </button>
          ))}
        </div>
      )}

      {/* Zone média + filtres */}
      <div ref={wrapRef} className="relative flex min-h-0 flex-1 flex-col">
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          {isVideo ? (
            <video
              src={draft.previewUrl}
              className="max-h-full max-w-full object-contain"
              controls
              playsInline
            />
          ) : (
            <div className="relative inline-block max-h-[min(72dvh,640px)] max-w-[100vw]">
              <img
                ref={imgRef}
                src={draft.previewUrl}
                alt=""
                className="block max-h-[min(72dvh,640px)] max-w-[100vw] object-contain"
                style={{ filter: filterCss === 'none' ? undefined : filterCss }}
                onLoad={syncDrawCanvasSize}
                onClick={onImageClick}
              />
              <canvas
                ref={drawCanvasRef}
                className={cn(
                  'pointer-events-none absolute left-0 top-0',
                  drawMode && 'pointer-events-auto touch-none'
                )}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
              />
              {!isVideo &&
                stickerPlacements.map((s, i) => (
                  <span
                    key={`${s.emoji}-${i}`}
                    className="pointer-events-none absolute text-[clamp(1.5rem,8vw,2.75rem)]"
                    style={{
                      left: `${s.x * 100}%`,
                      top: `${s.y * 100}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {s.emoji}
                  </span>
                ))}
              {!isVideo && overlayText.trim() && (
                <div className="pointer-events-none absolute inset-x-0 bottom-3 px-4 text-center">
                  <span
                    className="inline-block max-w-full rounded-lg bg-black/45 px-3 py-1 text-[clamp(0.85rem,3.5vw,1.1rem)] font-semibold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                    style={{ textShadow: '0 1px 2px #000' }}
                  >
                    {overlayText.trim()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filtres (chevron) */}
        {!isVideo && (
          <button
            type="button"
            onClick={() => setFiltersOpen((p) => !p)}
            className="relative z-20 flex w-full flex-col items-center py-1 text-white/70 hover:text-white"
            aria-expanded={filtersOpen}
          >
            {filtersOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
            <span className="text-[12px] font-medium">{labels.filters ?? 'Filtres'}</span>
          </button>
        )}
        {filtersOpen && !isVideo && (
          <div className="relative z-20 flex gap-2 overflow-x-auto px-3 pb-2 scrollbar-none">
            {FILTER_PRESETS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilterKey(f.key)}
                className={cn(
                  'shrink-0 rounded-full px-4 py-2 text-[13px] font-medium',
                  filterKey === f.key ? 'bg-white/25 text-white' : 'bg-white/10 text-white/75 hover:bg-white/15'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dialogue texte sur image */}
      {textDialogOpen && (
        <div className="absolute inset-0 z-[240] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/12 bg-[#0f1724] p-4 text-white shadow-xl">
            <p className="mb-2 text-sm font-medium">{labels.textOnImage ?? 'Texte sur la photo'}</p>
            <Input
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              placeholder={labels.textPlaceholder ?? 'Votre texte...'}
              className="mb-3 border-white/15 bg-white/[0.06] text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm text-white/70 hover:bg-white/10"
                onClick={() => setTextDialogOpen(false)}
              >
                {labels.cancel ?? 'Annuler'}
              </button>
              <button
                type="button"
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                onClick={() => {
                  setOverlayText(textDraft);
                  setTextDialogOpen(false);
                }}
              >
                {labels.apply ?? 'Appliquer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barre légende + vue unique */}
      <div className="relative z-30 border-t border-white/10 bg-black/75 px-3 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[620px] items-center gap-2 rounded-full border border-white/12 bg-[#141a24]/95 px-2 py-1.5">
          {onAddMoreMedia && (
            <button
              type="button"
              onClick={onAddMoreMedia}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/10"
              aria-label={labels.addMedia ?? 'Ajouter un média'}
            >
              <ImagePlus className="h-5 w-5" />
            </button>
          )}
          <Input
            value={draft.caption || ''}
            onChange={(e) => onCaptionChange?.(e.target.value)}
            placeholder={labels.captionPlaceholder ?? 'Ajouter une légende...'}
            className="h-11 min-w-0 flex-1 border-0 bg-transparent px-2 text-[15px] text-white placeholder:text-white/45 focus-visible:ring-0"
          />
          <button
            type="button"
            onClick={() => setViewOnce((p) => !p)}
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-dashed text-sm font-bold',
              viewOnce ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100' : 'border-white/35 text-white/80 hover:bg-white/10'
            )}
            aria-label={labels.viewOnce ?? 'Vue unique'}
            title={labels.viewOnce ?? 'Disparaît après lecture'}
          >
            1
          </button>
        </div>
        <div className="mx-auto mt-3 flex max-w-[620px] items-center justify-between gap-3">
          {recipientName ? (
            <span className="truncate rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-medium text-white/88">
              {recipientName}
            </span>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={handleSendClick}
            disabled={sending}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-slate-900 shadow-[0_8px_28px_rgba(37,211,102,0.45)] hover:bg-[#20bd5a] disabled:opacity-60"
            aria-label={labels.send ?? 'Envoyer'}
          >
            <Send className="h-6 w-6 -translate-x-px translate-y-px" strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </div>
  );
}
