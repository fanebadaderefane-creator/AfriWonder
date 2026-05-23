import React, { useEffect, useRef, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const GIFT_ANIMATIONS = {
  heart: { emoji: '❤️', particles: 8, color: '#ef4444', sound: 'heartbeat' },
  star: { emoji: '⭐', particles: 12, color: '#f59e0b', sound: 'sparkle' },
  fire: { emoji: '🔥', particles: 10, color: '#ef5350', sound: 'fire' },
  crown: { emoji: '👑', particles: 6, color: '#fbbf24', sound: 'royal' },
  diamond: { emoji: '💎', particles: 15, color: '#06b6d4', sound: 'crystal' },
  plane: { emoji: '✈️', particles: 5, color: '#3b82f6', sound: 'whoosh' },
  tip: { emoji: '💵', particles: 10, color: '#f59e0b', sound: 'cash' }
};

const TIER_CONFIG = {
  standard: { scale: 1, duration: 2, distance: 120, glow: 8, particles: 1, rotation: 0 },
  featured: { scale: 1.2, duration: 2.2, distance: 150, glow: 12, particles: 1.2, rotation: 5 },
  super: { scale: 1.4, duration: 2.5, distance: 180, glow: 16, particles: 1.5, rotation: 10 },
  premium: { scale: 1.6, duration: 2.8, distance: 220, glow: 22, particles: 2, rotation: 15, trail: true },
  vip: { scale: 2, duration: 3, distance: 280, glow: 30, particles: 2.5, rotation: 20, trail: true, explosion: true }
};

export default function AdvancedGiftAnimation({ gift, position = { x: 0, y: 0 }, tier = 'standard', onComplete }) {
  const giftData = GIFT_ANIMATIONS[gift?.id] || GIFT_ANIMATIONS.heart;
  const tierCfg = TIER_CONFIG[tier] || TIER_CONFIG.standard;
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef(null);
  
  // Optimiser le nombre de particules selon les performances
  const particleCount = useMemo(() => {
    if (shouldReduceMotion) return Math.min(5, giftData.particles);
    // Réduire pour les appareils moins puissants
    const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
    const baseCount = Math.floor(giftData.particles * tierCfg.particles);
    return isLowEnd ? Math.min(baseCount, 15) : baseCount;
  }, [giftData.particles, tierCfg.particles, shouldReduceMotion]);

  useEffect(() => {
    // Effet de vibration pour VIP/Premium
    if (tier === 'vip' || tier === 'premium') {
      const interval = setInterval(() => {
        if (containerRef.current) {
          containerRef.current.style.transform = `translate(${Math.random() * 4 - 2}px, ${Math.random() * 4 - 2}px)`;
        }
      }, 50);
      return () => clearInterval(interval);
    }
  }, [tier]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ scale: 0, opacity: 1, rotate: -tierCfg.rotation }}
      animate={{ 
        scale: tierCfg.scale, 
        opacity: 1, 
        rotate: tierCfg.rotation,
        filter: tier === 'vip' ? 'drop-shadow(0 0 20px rgba(255,215,0,0.8))' : 'none'
      }}
      exit={{ opacity: 0, scale: 0 }}
      className="fixed pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        zIndex: 50,
        transformOrigin: 'center center'
      }}
      onAnimationComplete={onComplete}
    >
      {/* Effet d'explosion pour VIP */}
      {tierCfg.explosion && (
        <motion.div
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${giftData.color} 0%, transparent 70%)`,
            filter: 'blur(20px)',
            width: 100,
            height: 100,
            marginLeft: -50,
            marginTop: -50
          }}
        />
      )}

      {/* Emoji principal avec rotation 3D (désactivé si reduced motion) */}
      <motion.div
        initial={{ y: 0, rotateX: 0, rotateY: 0 }}
        animate={{ 
          y: -tierCfg.distance - 100,
          rotateX: shouldReduceMotion ? 0 : (tier === 'vip' ? 360 : tier === 'premium' ? 180 : 0),
          rotateY: shouldReduceMotion ? 0 : (tier === 'vip' ? 360 : 0)
        }}
        transition={{ 
          duration: tierCfg.duration, 
          ease: 'easeOut',
          rotateX: shouldReduceMotion ? {} : { duration: tierCfg.duration * 0.8, repeat: tier === 'vip' ? Infinity : 0 },
          rotateY: shouldReduceMotion ? {} : { duration: tierCfg.duration * 0.6, repeat: tier === 'vip' ? Infinity : 0 }
        }}
        className="text-5xl"
        style={{
          transformStyle: shouldReduceMotion ? 'flat' : 'preserve-3d',
          perspective: shouldReduceMotion ? 'none' : '1000px'
        }}
      >
        {giftData.emoji}
      </motion.div>

      {/* Particules avancées avec trajectoires variées (limitées pour performance) */}
      {!shouldReduceMotion && Array.from({ length: particleCount }).map((_, idx) => {
        const angle = (idx / particleCount) * Math.PI * 2;
        const distance = tierCfg.distance + (idx % 3) * 20;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        const delay = idx * 0.02;
        const particleType = idx % 3 === 0 ? '💫' : idx % 3 === 1 ? '✨' : '⭐';

        return (
          <motion.div
            key={idx}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
            animate={{ 
              x, 
              y, 
              opacity: 0, 
              scale: 0,
              rotate: 360
            }}
            transition={{ 
              duration: tierCfg.duration - 0.3, 
              ease: 'easeOut', 
              delay,
              rotate: { duration: tierCfg.duration, ease: 'linear' }
            }}
            className="absolute text-2xl pointer-events-none"
            style={{
              filter: tier === 'vip' ? 'drop-shadow(0 0 8px rgba(255,215,0,0.6))' : 'none'
            }}
          >
            {particleType}
          </motion.div>
        );
      })}

      {/* Traînée pour Premium/VIP */}
      {tierCfg.trail && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 2] }}
          transition={{ duration: tierCfg.duration, times: [0, 0.3, 1] }}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `conic-gradient(from 0deg, ${giftData.color}, transparent, ${giftData.color})`,
            filter: `blur(${tierCfg.glow}px)`,
            width: 80 * tierCfg.scale,
            height: 80 * tierCfg.scale,
            marginLeft: -40 * tierCfg.scale,
            marginTop: -40 * tierCfg.scale,
            animation: tier === 'vip' ? 'spin 2s linear infinite' : 'none'
          }}
        />
      )}

      {/* Glow radial */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.6, times: [0, 0.5, 1] }}
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${giftData.color} 0%, transparent 70%)`,
          filter: `blur(${tierCfg.glow}px)`,
          width: 60 * tierCfg.scale,
          height: 60 * tierCfg.scale,
          marginLeft: -30 * tierCfg.scale,
          marginTop: -30 * tierCfg.scale
        }}
      />

      {/* Effet de vague pour VIP */}
      {tier === 'vip' && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ 
                duration: 1, 
                delay: i * 0.3,
                repeat: Infinity,
                repeatDelay: 2
              }}
              className="absolute inset-0 rounded-full border-2 pointer-events-none"
              style={{
                borderColor: giftData.color,
                width: 40,
                height: 40,
                marginLeft: -20,
                marginTop: -20
              }}
            />
          ))}
        </>
      )}
    </motion.div>
  );
}
