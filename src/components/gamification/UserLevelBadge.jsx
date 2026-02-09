import React from "react";
import { motion } from "framer-motion";

export default function UserLevelBadge({ level = 1, points = 0, nextLevelPoints = 1000 }) {
  const progress = (points % nextLevelPoints) / nextLevelPoints * 100;

  const getLevelColor = (lvl) => {
    if (lvl >= 50) return "from-yellow-500 to-yellow-600";
    if (lvl >= 30) return "from-purple-500 to-purple-600";
    if (lvl >= 20) return "from-blue-500 to-blue-600";
    if (lvl >= 10) return "from-orange-500 to-orange-600";
    return "from-green-500 to-green-600";
  };

  return (
    <motion.div
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      className={`bg-gradient-to-br ${getLevelColor(level)} rounded-full w-20 h-20 flex flex-col items-center justify-center text-white relative shadow-lg`}
    >
      <div className="text-3xl font-bold">{level}</div>
      <div className="text-xs font-semibold">Niveau</div>

      {/* Progress ring */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2"
        />
        <motion.circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeDasharray={`${(36 * 2 * Math.PI * progress) / 100} ${36 * 2 * Math.PI}`}
          initial={{ strokeDashoffset: 36 * 2 * Math.PI }}
          animate={{ strokeDashoffset: 36 * 2 * Math.PI * (1 - progress / 100) }}
          style={{ transform: "rotate(-90deg)", transformOrigin: "40px 40px" }}
        />
      </svg>
    </motion.div>
  );
}