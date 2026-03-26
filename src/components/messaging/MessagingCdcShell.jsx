import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import BottomNav from '@/components/navigation/BottomNav';
import { cn } from '@/lib/utils';
import { CdcFooterNote } from '@/components/messaging/MessagingCdcUi';

const PAGE_BG = 'bg-[#070a12]';

/**
 * Enveloppe commune pour les écrans « CDC messagerie complète » (shell frontend).
 */
export default function MessagingCdcShell({
  title,
  subtitle,
  children,
  className,
  contentClassName,
  backTo = 'MessagingCdcHub',
}) {
  const navigate = useNavigate();

  return (
    <div className={cn('relative flex min-h-[100dvh] flex-col text-white', PAGE_BG, className)}>
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_40%),linear-gradient(180deg,_#08101f_0%,_#070d18_45%,_#050913_100%)]" />
      </div>

      <header className="relative z-10 flex items-center gap-3 border-b border-white/[0.06] px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl text-white/85 hover:bg-white/[0.08]"
          onClick={() => navigate(createPageUrl(backTo))}
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight text-white">{title}</h1>
          {subtitle ? <p className="mt-0.5 truncate text-[13px] text-white/45">{subtitle}</p> : null}
        </div>
      </header>

      <main className={cn('relative z-10 mx-auto w-full max-w-3xl flex-1 px-3 pb-28 pt-4', contentClassName)}>
        {children}
        <CdcFooterNote />
      </main>

      <BottomNav />
    </div>
  );
}
