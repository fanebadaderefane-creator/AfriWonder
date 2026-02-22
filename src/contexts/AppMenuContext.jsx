/**
 * Contexte global pour le menu principal (MenuPlus).
 * Permet d'ouvrir/fermer le menu depuis n'importe quelle page.
 * Si l'utilisateur ouvre le menu puis part vers une fonctionnalité, le menu se rouvre à son retour.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';

const AppMenuContext = createContext(null);

export function AppMenuProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reopenMenuOnPath, setReopenMenuOnPath] = useState(null);

  const openMenu = useCallback(() => setIsOpen(true), []);
  const closeMenu = useCallback(() => setIsOpen(false), []);
  const toggleMenu = useCallback(() => setIsOpen((prev) => !prev), []);

  /** À appeler quand l'utilisateur quitte le menu en cliquant sur une entrée : à son retour sur cette path, le menu se rouvrira */
  const scheduleReopenWhenReturn = useCallback((path) => {
    if (path) setReopenMenuOnPath(path);
    setIsOpen(false);
  }, []);

  const clearReopenMenuOnPath = useCallback(() => setReopenMenuOnPath(null), []);

  const value = {
    isOpen,
    openMenu,
    closeMenu,
    toggleMenu,
    reopenMenuOnPath,
    scheduleReopenWhenReturn,
    clearReopenMenuOnPath,
  };

  return (
    <AppMenuContext.Provider value={value}>
      {children}
    </AppMenuContext.Provider>
  );
}

export function useAppMenu() {
  const context = useContext(AppMenuContext);
  if (!context) {
    throw new Error('useAppMenu must be used within AppMenuProvider');
  }
  return context;
}
