"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, memo } from "react";

export const NameReveal = memo(function NameReveal() {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      className="relative inline-flex items-baseline"
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <span className="text-5xl font-bold tracking-tight md:text-6xl">
        charles
      </span>
      <AnimatePresence>
        {hovered && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.25 }}
            className="absolute left-full ml-2 text-5xl font-bold text-accent md:text-6xl"
          >
            zheng
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
