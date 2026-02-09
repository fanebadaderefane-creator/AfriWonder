import React from 'react';
import { motion } from 'framer-motion';

const GIFT_ANIMATIONS = {
  heart: {
    emoji: '❤️',
    particles: 8,
    color: '#ef4444'
  },
  star: {
    emoji: '⭐',
    particles: 12,
    color: '#f59e0b'
  },
  fire: {
    emoji: '🔥',
    particles: 10,
    color: '#ef5350'
  },
  crown: {
    emoji: '👑',
    particles: 6,
    color: '#fbbf24'
  },
  diamond: {
    emoji: '💎',
    particles: 15,
    color: '#06b6d4'
  },
  plane: {
    emoji: '✈️',
    particles: 5,
    color: '#3b82f6'
  }
};

export default function GiftAnimation({ gift, position = { x: 0, y: 0 }, onComplete }) {
  const giftData = GIFT_ANIMATIONS[gift?.id] || GIFT_ANIMATIONS.heart;
  const particles = Array.from({ length: giftData.particles });

  return (
    <motion.div
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        zIndex: 50
      }}
      onAnimationComplete={onComplete}
    >
      {/* Main Gift Icon */}
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: -300 }}
        transition={{ duration: 2.5, ease: 'easeOut' }}
        className="text-5xl"
      >
        {giftData.emoji}
      </motion.div>

      {/* Particle Effects */}
      {particles.map((_, idx) => {
        const angle = (idx / particles.length) * Math.PI * 2;
        const distance = 150;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        return (
          <motion.div
            key={idx}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{ x, y, opacity: 0 }}
            transition={{ duration: 2, ease: 'easeOut', delay: idx * 0.02 }}
            className="absolute text-2xl pointer-events-none"
          >
            ✨
          </motion.div>
        );
      })}

      {/* Shine Effect */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.6, times: [0, 0.5, 1] }}
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${giftData.color} 0%, transparent 70%)`,
          filter: 'blur(8px)',
          width: 60,
          height: 60,
          marginLeft: -30,
          marginTop: -30
        }}
      />
    </motion.div>
  );
}