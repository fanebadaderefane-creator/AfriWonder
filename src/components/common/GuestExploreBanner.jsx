import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { readGuestExplore } from '@/lib/guestExplore';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

/**
 * Bandeau discret — mode invité (audit : guest sans compte).
 */
export default function GuestExploreBanner() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  if (isAuthenticated || !readGuestExplore()) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-[60] flex flex-wrap items-center justify-center gap-2 border-b border-white/10 bg-[#0f172a]/95 px-3 py-2 text-center text-[12px] text-white/88 backdrop-blur-md"
    >
      <span>Mode invité — explorez le feed. Connectez-vous pour publier ou accéder au wallet.</span>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="h-8 rounded-full bg-white/15 px-3 text-white hover:bg-white/25"
        onClick={() => navigate(createPageUrl('Landing'))}
      >
        <LogIn className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        Connexion
      </Button>
    </div>
  );
}
