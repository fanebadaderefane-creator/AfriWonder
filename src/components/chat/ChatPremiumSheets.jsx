import React, { useEffect, useMemo, useState } from 'react';
import {
  Image as ImageIcon,
  Camera,
  Video,
  FileText,
  MapPin,
  UserPlus,
  Headphones,
  CalendarClock,
  Timer,
  BarChart3,
  CalendarDays,
  Sparkles,
  Search,
  Smile,
  Sticker,
  Clapperboard,
  Loader2,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { stickerPackItems } from '@/lib/twemojiSticker';

const EMOJI_LIBRARY = ['😀', '😃', '😄', '😁', '😆', '🥲', '😂', '🤣', '😊', '😉', '😍', '😘', '😎', '🤩', '🥳', '🤔', '🤗', '😴', '😡', '😭', '👍', '👎', '👏', '🙌', '🙏', '💪', '🔥', '✨', '💙', '❤️', '💯', '🎉', '🌍', '🇲🇱', '🇸🇳', '🇨🇮', '🧡', '💚', '💛', '🖤', '🤍', '👋', '🤝', '✌️', '🤞', '💋', '🎵', '🎶', '☀️', '🌙', '⭐', '🌈'];

/**
 * Grille pièces jointes type WhatsApp (capture 2).
 */
export function ChatAttachmentSheet({
  open,
  onOpenChange,
  labels,
  onGallery,
  onCameraPhoto,
  onCameraVideo,
  onDocument,
  onLocation,
  onContact,
  onSchedule,
  onToggleEphemeral,
  onAudioHint,
  onPollSoon,
  onEventSoon,
  onAiImagesSoon,
  ephemeralActive,
}) {
  const items = useMemo(
    () => [
      { key: 'gallery', label: labels.attachGallery, icon: ImageIcon, color: 'bg-sky-500', onClick: onGallery },
      { key: 'camPhoto', label: labels.attachCameraPhoto, icon: Camera, color: 'bg-pink-500', onClick: onCameraPhoto },
      { key: 'camVideo', label: labels.attachCameraVideo, icon: Video, color: 'bg-rose-600', onClick: onCameraVideo },
      { key: 'doc', label: labels.attachDocument, icon: FileText, color: 'bg-violet-600', onClick: onDocument },
      { key: 'loc', label: labels.attachLocation, icon: MapPin, color: 'bg-emerald-600', onClick: onLocation },
      { key: 'contact', label: labels.attachContact, icon: UserPlus, color: 'bg-cyan-600', onClick: onContact },
      { key: 'audio', label: labels.attachAudio, icon: Headphones, color: 'bg-orange-500', onClick: onAudioHint },
      { key: 'schedule', label: labels.attachSchedule, icon: CalendarClock, color: 'bg-amber-600', onClick: onSchedule },
      {
        key: 'ephemeral',
        label: labels.attachEphemeral,
        icon: Timer,
        color: ephemeralActive ? 'bg-teal-500 ring-2 ring-white/40' : 'bg-slate-600',
        onClick: onToggleEphemeral,
      },
      { key: 'poll', label: labels.attachPoll, icon: BarChart3, color: 'bg-yellow-500', onClick: onPollSoon },
      { key: 'event', label: labels.attachEvent, icon: CalendarDays, color: 'bg-fuchsia-600', onClick: onEventSoon },
      { key: 'ai', label: labels.attachAiImages, icon: Sparkles, color: 'bg-indigo-500', onClick: onAiImagesSoon },
    ],
    [
      labels,
      onGallery,
      onCameraPhoto,
      onCameraVideo,
      onDocument,
      onLocation,
      onContact,
      onAudioHint,
      onSchedule,
      onToggleEphemeral,
      onPollSoon,
      onEventSoon,
      onAiImagesSoon,
      ephemeralActive,
    ]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[min(88dvh,560px)] rounded-t-[28px] border border-white/12 bg-[#0c121c] p-0 text-white shadow-[0_-20px_60px_rgba(0,0,0,0.5)] [&>button]:right-4 [&>button]:top-4 [&>button]:border-0 [&>button]:bg-white/10 [&>button]:text-white [&>button]:hover:bg-white/18"
      >
        <SheetTitle className="sr-only">{labels.attachmentSheetTitle}</SheetTitle>
        <div className="px-4 pb-6 pt-2">
          <div className="mx-auto mb-5 h-1.5 w-11 rounded-full bg-white/18" aria-hidden />
          <p className="mb-5 text-center text-[15px] font-semibold tracking-tight text-white/92">{labels.attachmentSheetTitle}</p>
          <div className="grid grid-cols-3 gap-x-2 gap-y-5 sm:grid-cols-4">
            {items.map(({ key, label, icon: Icon, color, onClick }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onClick?.();
                }}
                className="flex flex-col items-center gap-2 rounded-2xl py-1 text-center [touch-action:manipulation] active:scale-[0.97]"
              >
                <span className={cn('flex h-[54px] w-[54px] items-center justify-center rounded-full text-white shadow-lg', color)}>
                  <Icon className="h-7 w-7" strokeWidth={1.75} />
                </span>
                <span className="max-w-[5.5rem] text-center text-[11px] font-medium leading-tight text-white/78">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const TAB = {
  search: 'search',
  emoji: 'emoji',
  gif: 'gif',
  sticker: 'sticker',
};

/**
 * Panneau inférieur stickers / emoji (réf. capture 4) — insertion texte ou envoi sticker.
 */
export function ChatStickerComposerSheet({
  open,
  onOpenChange,
  labels,
  emojiSearch,
  setEmojiSearch,
  onPickEmoji,
  onPickStickerUrl,
  onStickerCreateSoon,
  giphyApiKey,
  onPickGifUrl,
}) {
  const [tab, setTab] = useState(TAB.sticker);
  const [gifSearch, setGifSearch] = useState('');
  const [gifItems, setGifItems] = useState([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifFetchFailed, setGifFetchFailed] = useState(false);
  const stickers = useMemo(() => stickerPackItems(), []);

  useEffect(() => {
    if (!open) {
      setGifSearch('');
      setGifItems([]);
      setGifFetchFailed(false);
    }
  }, [open]);

  useEffect(() => {
    if (tab !== TAB.gif || !giphyApiKey?.trim()) return undefined;
    const handle = window.setTimeout(async () => {
      setGifLoading(true);
      setGifFetchFailed(false);
      try {
        const q = gifSearch.trim();
        const base = q
          ? `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(giphyApiKey.trim())}&q=${encodeURIComponent(q)}&limit=30&rating=g&lang=fr`
          : `https://api.giphy.com/v1/gifs/trending?api_key=${encodeURIComponent(giphyApiKey.trim())}&limit=30&rating=g`;
        const res = await fetch(base);
        if (!res.ok) throw new Error('giphy_http');
        const json = await res.json();
        const next = (Array.isArray(json.data) ? json.data : [])
          .map((g) => ({
            id: g.id,
            url:
              g.images?.fixed_height_small?.url
              || g.images?.downsized_small?.url
              || g.images?.downsized?.url
              || g.images?.preview_gif?.url
              || '',
          }))
          .filter((x) => x.url);
        setGifItems(next);
      } catch {
        setGifFetchFailed(true);
        setGifItems([]);
      } finally {
        setGifLoading(false);
      }
    }, 380);
    return () => window.clearTimeout(handle);
  }, [tab, gifSearch, giphyApiKey]);

  const filteredEmojis = useMemo(
    () => EMOJI_LIBRARY.filter((e) => e.includes(emojiSearch) || emojiSearch.trim().length === 0),
    [emojiSearch]
  );

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setEmojiSearch('');
          setGifSearch('');
        }
      }}
    >
      <SheetContent
        side="bottom"
        className="max-h-[min(72dvh,480px)] rounded-t-[20px] border border-white/10 bg-[#0a0e14] p-0 text-white shadow-[0_-12px_48px_rgba(0,0,0,0.55)] [&>button]:right-3 [&>button]:top-3 [&>button]:h-9 [&>button]:w-9 [&>button]:border-0 [&>button]:bg-white/[0.08] [&>button]:text-white/90 [&>button]:hover:bg-white/14"
      >
        <SheetTitle className="sr-only">{labels.stickerSheetTitle}</SheetTitle>
        <div className="flex flex-col pt-1.5">
          <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-white/14" aria-hidden />
          <div className="flex items-stretch justify-center gap-0 border-b border-white/[0.07] px-1">
            {[
              { id: TAB.search, icon: Search, aria: labels.tabSearch },
              { id: TAB.emoji, icon: Smile, aria: labels.tabEmoji },
              { id: TAB.gif, icon: Clapperboard, aria: labels.tabGif },
              { id: TAB.sticker, icon: Sticker, aria: labels.tabSticker },
            ].map(({ id, icon: Icon, aria }) => (
              <button
                key={id}
                type="button"
                aria-label={aria}
                onClick={() => setTab(id)}
                className={cn(
                  'relative flex min-h-[44px] flex-1 max-w-[4.5rem] flex-col items-center justify-center text-white/38 transition-colors hover:text-white/65',
                  tab === id && 'text-emerald-400'
                )}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={tab === id ? 2.2 : 1.65} />
                {tab === id && <span className="absolute bottom-0 left-[18%] right-[18%] h-[2px] rounded-full bg-emerald-400" />}
              </button>
            ))}
          </div>

          {(tab === TAB.search || tab === TAB.emoji) && (
            <div className="border-b border-white/[0.06] px-2.5 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                <Input
                  className="h-9 rounded-full border-white/10 bg-white/[0.05] pl-8 text-[13px] text-white placeholder:text-white/32"
                  placeholder={labels.stickerSearchPlaceholder}
                  value={emojiSearch}
                  onChange={(e) => setEmojiSearch(e.target.value)}
                />
              </div>
            </div>
          )}

          {tab === TAB.gif && giphyApiKey?.trim() && (
            <div className="border-b border-white/[0.06] px-2.5 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                <Input
                  className="h-9 rounded-full border-white/10 bg-white/[0.05] pl-8 text-[13px] text-white placeholder:text-white/32"
                  placeholder={labels.gifSearchPlaceholder}
                  value={gifSearch}
                  onChange={(e) => setGifSearch(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3 pt-2">
            {tab === TAB.gif && !giphyApiKey?.trim() && (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <Clapperboard className="h-10 w-10 text-white/22" strokeWidth={1.2} />
                <p className="max-w-[240px] text-xs text-white/45">{labels.gifComingSoon}</p>
              </div>
            )}

            {tab === TAB.gif && giphyApiKey?.trim() && (
              <div className="space-y-2">
                {gifLoading && (
                  <div className="flex justify-center py-10" role="status" aria-live="polite">
                    <Loader2 className="h-8 w-8 animate-spin text-white/35" />
                  </div>
                )}
                {!gifLoading && gifFetchFailed && (
                  <p className="px-2 py-8 text-center text-sm text-amber-200/90">{labels.gifLoadError}</p>
                )}
                {!gifLoading && !gifFetchFailed && gifItems.length === 0 && (
                  <p className="px-2 py-8 text-center text-sm text-white/42">{labels.gifSearchPlaceholder}</p>
                )}
                {!gifLoading && !gifFetchFailed && gifItems.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                    {gifItems.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        className="aspect-square overflow-hidden rounded-lg bg-black/30 ring-1 ring-inset ring-white/[0.06] [touch-action:manipulation] transition-transform active:scale-95"
                        onClick={() => {
                          onPickGifUrl?.(g.url);
                          onOpenChange(false);
                        }}
                      >
                        <img src={g.url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" draggable={false} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(tab === TAB.emoji || tab === TAB.search) && (
              <div className="grid grid-cols-9 gap-0.5 sm:grid-cols-11">
                {filteredEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="flex aspect-square max-h-10 items-center justify-center rounded-lg text-[1.35rem] leading-none transition-colors [touch-action:manipulation] hover:bg-white/[0.07] active:scale-95 active:bg-white/10"
                    onClick={() => onPickEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {tab === TAB.sticker && (
              <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-9 sm:gap-2">
                <button
                  type="button"
                  onClick={() => onStickerCreateSoon?.()}
                  className="group flex aspect-square min-h-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-emerald-500/35 bg-emerald-500/[0.07] [touch-action:manipulation] transition-colors hover:border-emerald-400/45 hover:bg-emerald-500/12 active:scale-[0.97]"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white shadow-sm group-active:bg-emerald-500">
                    +
                  </span>
                  <span className="max-w-full truncate px-0.5 text-center text-[8px] font-medium uppercase tracking-wide text-emerald-200/75 sm:text-[9px]">
                    {labels.stickerCreate}
                  </span>
                </button>
                {stickers.map(({ id, url }) => (
                  <button
                    key={id}
                    type="button"
                    className="aspect-square min-h-0 overflow-hidden rounded-lg bg-white/[0.04] p-1 ring-1 ring-inset ring-white/[0.05] transition-[transform,background-color] [touch-action:manipulation] hover:bg-white/[0.08] active:scale-95"
                    onClick={() => onPickStickerUrl(url)}
                  >
                    <img src={url} alt="" className="h-full w-full object-contain p-px" loading="lazy" decoding="async" draggable={false} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
