"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

type MotionRevealProps = {
  children: ReactNode;
  delay?: number;
};

export function MotionReveal({ children, delay = 0 }: MotionRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.6, ease: "easeOut", delay }}
      viewport={{ once: true, margin: "-100px" }}
    >
      {children}
    </motion.div>
  );
}
