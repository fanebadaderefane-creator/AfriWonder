import React from "react";
import { motion } from "framer-motion";

export default function UserBadgeDisplay({ badges = [] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {badges.slice(0, 5).map((badge, index) => (
        <motion.div
          key={badge.id}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.1 }}
          title={badge.badge_description}
        >
          <div className="text-2xl cursor-pointer hover:scale-110 transition-transform">
            {badge.badge_icon}
          </div>
        </motion.div>
      ))}
      {badges.length > 5 && (
        <div className="text-sm font-semibold text-blue-600 self-center">
          +{badges.length - 5}
        </div>
      )}
    </div>
  );
}