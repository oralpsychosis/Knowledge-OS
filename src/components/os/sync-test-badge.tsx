import React from "react";
import { motion } from "motion/react";

export function SyncTestBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-pink-500 px-4 py-2 text-[12px] font-bold text-white shadow-lg shadow-pink-500/40"
    >
      <span>🦄 Sync Test Active</span>
    </motion.div>
  );
}