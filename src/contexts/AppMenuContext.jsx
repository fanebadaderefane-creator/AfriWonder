/**
 * Contexte global pour le menu principal (MenuPlus).
 * Permet d'ouvrir/fermer le menu depuis n'importe quelle page.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';

const AppMenuContext = createContext(null);

export function AppMenuProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const openMenu = useCallback(() => setIsOpen(true), []);
  const closeMenu = useCallback(() => setIsOpen(false), []);
  const toggleMenu = useCallback(() => setIsOpen((prev) => !prev), []);

  const value = {
    isOpen,
    openMenu,
    closeMenu,
    toggleMenu,
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
