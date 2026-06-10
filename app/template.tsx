"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0.98 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.18,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{
        backfaceVisibility: "hidden",
      }}
    >
      {children}
    </motion.div>
  );
}
