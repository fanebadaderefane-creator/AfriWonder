/**
 * Bouton flottant pour ouvrir le menu principal.
 * Affiché sur toutes les pages sauf Home (qui a son propre header avec menu).
 */
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { useAppMenu } from '@/contexts/AppMenuContext';
import { cn } from '@/lib/utils';

export default function GlobalMenuButton({ hideOnHome = true, className }) {
  const { openMenu } = useAppMenu();
  const { pathname } = useLocation();
  const isHome = pathname === '/' || pathname === '/Home' || pathname.toLowerCase() === '/home';

  if (hideOnHome && isHome) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={openMenu}
      aria-label="Ouvrir le menu"
      className={cn(
        'fixed right-4 z-[45] h-11 w-11 rounded-xl',
        'top-[max(1rem,env(safe-area-inset-top,1rem))]',
        'bg-slate-800/90 backdrop-blur-md border border-white/20',
        'text-white hover:bg-slate-700/90 hover:text-white',
        'shadow-lg transition-all duration-200',
        'min-w-[44px] min-h-[44px]',
        className
      )}
    >
      <Menu className="w-5 h-5" />
    </Button>
  );
}
