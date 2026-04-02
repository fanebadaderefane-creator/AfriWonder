import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, PlusSquare, User, Radio } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import { useTranslation } from '@/components/common/useTranslation';
import { preloadPageByName } from '@/pages.config.glob';

export default function BottomNav({ fixed = true, feedMode = false }) {
  const location = useLocation();
  const { t } = useTranslation();
  const warmPage = (page) => {
    preloadPageByName(page).catch(() => {});
  };

  const navItems = [
    { id: 'home', icon: Home, label: t('home'), page: 'Home' },
    { id: 'discover', icon: Compass, label: t('discover'), page: 'Discover' },
    { id: 'create', icon: PlusSquare, label: '', page: 'Create', isCreate: true },
    { id: 'live', icon: Radio, label: t('live'), page: 'Lives' },
    { id: 'profile', icon: User, label: t('profile'), page: 'Profile' },
  ];

  

  const isActive = (page) => {
    const p = location.pathname.toLowerCase();
    if (page === 'Home') return p === '/' || p === '/home';
    return p.includes(page.toLowerCase());
  };

  return (

    <nav 
      className={cn(
        fixed || feedMode ? 'z-[60]' : 'z-[50]',
        fixed
          ? 'fixed bottom-0 left-0 right-0 h-[86px] bg-transparent'
          : feedMode
          ? // fixed (viewport) : sur iOS, absolute dans la colonne feed peut finir sous le player / mauvais stacking.
            'fixed bottom-0 left-0 right-0 h-[68px] border-0 bg-transparent px-3 shadow-none pointer-events-none [&>*]:pointer-events-auto sm:h-[72px]'
          : 'relative h-[86px] bg-transparent'
      )}

      style={{
        paddingBottom: feedMode
          ? 'max(12px, env(safe-area-inset-bottom, 0px))'
          : 'max(env(safe-area-inset-bottom), 8px)',
      }}
      role="navigation"
      aria-label="Navigation principale AfriWonder"

    >

      {/* Même pill opaque partout (feed inclus) : comme TikTok, fond bien lisible + pas de “trou” au gradient */}
      <div
        className={cn(
          'mx-auto flex h-full w-full max-w-3xl items-center justify-around rounded-[26px] border px-2 backdrop-blur-xl transition-[background,box-shadow,border-color] duration-300',
          feedMode
            ? 'border-white/[0.07] bg-black/48 shadow-[0_10px_40px_rgba(0,0,0,0.28)] px-2.5'
            : 'rounded-[30px] border-white/12 bg-[#0b111d]/94 shadow-[0_22px_60px_rgba(2,6,23,0.34)] backdrop-blur-2xl'
        )}
      >

        {navItems.map((item) => {

          const Icon = item.icon;

          const active = isActive(item.page);

          

          if (item.isCreate) {

            return (

              <Link

                key={item.id}

                to={createPageUrl(item.page)}
                onMouseEnter={() => warmPage(item.page)}
                onFocus={() => warmPage(item.page)}
                onTouchStart={() => warmPage(item.page)}

                className={cn('relative', feedMode && '-mt-3')}
                aria-label={t('create')}

              >

                <motion.div
                  whileTap={{ scale: 0.92 }}
                  className={cn(
                    'flex items-center justify-center bg-white text-slate-950 shadow-[0_16px_36px_rgba(255,255,255,0.18)]',
                    feedMode ? 'h-12 w-12 rounded-[20px]' : 'h-12 w-12 rounded-2xl'
                  )}
                >

                  <Icon className={cn(feedMode ? 'h-5 w-5 text-slate-950' : 'h-6 w-6 text-slate-950')} strokeWidth={2.4} />

                </motion.div>

              </Link>

            );

          }

          

          return (

            <Link

              key={item.id}

              to={item.page === 'Home' ? '/' : createPageUrl(item.page)}
              onMouseEnter={() => warmPage(item.page)}
              onFocus={() => warmPage(item.page)}
              onTouchStart={() => warmPage(item.page)}

              className={cn(
                // Les <a> visités changent souvent la couleur du lien : les spans ont text-white mais les SVG héritent → icônes quasi invisibles.
                'relative flex flex-col items-center rounded-2xl text-white visited:text-white hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35',
                feedMode ? 'gap-1 px-2.5 py-1.5' : 'gap-1 px-3 py-2'
              )}
              style={{ color: '#ffffff' }}
              aria-label={item.label || item.page}

            >

              <motion.div

                whileTap={{ scale: 0.9 }}

                className={cn(
                  'relative rounded-full transition-all',
                  feedMode
                    ? // Pas de fond ni fill sur l’icône Accueil : le fill Lucide « Home » fait un gros carré blanc.
                      cn('p-1', 'bg-transparent')
                    : cn(
                        'p-1.5',
                        active
                          ? 'bg-white/[0.16] shadow-[0_12px_24px_rgba(2,6,23,0.18)] ring-1 ring-white/12'
                          : 'bg-white/[0.08] ring-1 ring-white/10'
                      )
                )}

              >

                <Icon
                  className={cn(
                    'shrink-0 transition-opacity duration-200 ease-out',
                    feedMode
                      ? 'h-5 w-5 drop-shadow-[0_1px_10px_rgba(0,0,0,0.45)]'
                      : 'h-6 w-6 drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]',
                    active ? 'opacity-100' : 'opacity-95',
                    item.page === 'Home' && active && !feedMode && 'fill-white'
                  )}
                  aria-hidden
                  stroke="#ffffff"
                  color="#ffffff"
                  fill={item.page === 'Home' && active && !feedMode ? '#ffffff' : 'none'}
                  strokeWidth={feedMode && active ? 2.5 : active ? 2.35 : 2.55}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: '#ffffff', stroke: '#ffffff' }}
                />
              </motion.div>

              <span className={cn(
                feedMode
                  ? 'text-[10px] font-medium tracking-[-0.01em] transition-colors duration-200 ease-out [text-shadow:0_1px_10px_rgba(0,0,0,0.35)]'
                  : 'text-[11px] font-medium tracking-[-0.01em] transition-colors duration-200 ease-out',
                active ? 'font-semibold text-white' : 'font-medium text-white/88'
              )}>

                {item.label}

              </span>

              {active && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 h-1 w-6 rounded-full bg-white shadow-[0_8px_18px_rgba(255,255,255,0.28)]"
                  data-testid="active-tab-indicator"
                />
              )}

            </Link>

          );

        })}

      </div>

    </nav>

  );

}
