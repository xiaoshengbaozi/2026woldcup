"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ y: 4 }}
      animate={{ y: 0 }}
      transition={{
        duration: 0.18,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{
        backfaceVisibility: "hidden",
        transform: "translate3d(0, 0, 0)",
      }}
    >
      {children}
    </motion.div>
  );
}
