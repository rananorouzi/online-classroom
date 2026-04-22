"use client";

import { motion } from "framer-motion";

/** Music note upload loading animation */
export function MusicNoteLoader() {
  const notes = ["♪", "♫", "♬", "♩"];

  return (
    <div className="flex items-center justify-center gap-2 py-8">
      {notes.map((note, i) => (
        <motion.span
          key={i}
          className="text-2xl text-gold"
          initial={{ y: 0, opacity: 0.3 }}
          animate={{
            y: [-8, 0, -8],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
        >
          {note}
        </motion.span>
      ))}
      <motion.span
        className="ml-2 text-sm text-zinc-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Uploading your masterpiece...
      </motion.span>
    </div>
  );
}

/** Sparkle burst effect for approvals */
export function SparkleEffect({
  children,
  active,
}: {
  children: React.ReactNode;
  active: boolean;
}) {
  return (
    <div className="relative">
      {children}
      {active && (
        <motion.div
          className="pointer-events-none absolute -inset-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2 }}
        >
          {[...Array(12)].map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            return (
              <motion.span
                key={i}
                className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-gold"
                initial={{ x: 0, y: 0, scale: 0 }}
                animate={{
                  x: Math.cos(angle) * 30,
                  y: Math.sin(angle) * 30,
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.05,
                  ease: "easeOut",
                }}
              />
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
