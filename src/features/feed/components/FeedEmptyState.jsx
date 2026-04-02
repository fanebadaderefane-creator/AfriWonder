import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * État vide du fil — texte et CTA légers sur la vidéo / fond (pas de grande carte encadrée).
 */
export default function FeedEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) {
  return (
    <div
      className={cn(
        'flex min-h-full w-full flex-col items-center justify-center px-6 pb-32 pt-24 text-center text-white',
        className
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="max-w-[300px] space-y-4"
      >
        {Icon ? (
          <div className="mx-auto flex h-12 w-12 items-center justify-center text-white/75">
            <Icon className="h-9 w-9 drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)]" strokeWidth={1.75} aria-hidden />
          </div>
        ) : null}

        <div className="space-y-2">
          <h2 className="text-lg font-semibold leading-snug tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)] sm:text-xl">
            {title}
          </h2>
          <p className="text-[14px] leading-relaxed text-white/65 drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]">
            {description}
          </p>
        </div>

        {actionLabel && onAction ? (
          <Button
            type="button"
            onClick={onAction}
            variant="ghost"
            className="h-11 rounded-full border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white shadow-none backdrop-blur-sm transition-all hover:bg-white/16 active:scale-[0.98]"
          >
            {actionLabel}
          </Button>
        ) : null}
      </motion.div>
    </div>
  );
}
