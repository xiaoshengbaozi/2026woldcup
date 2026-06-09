import type { Transition, Variants } from "framer-motion";

export const lineupPlayerEnterInitial = { opacity: 0, y: 8 };
export const lineupPlayerEnterAnimate = { opacity: 1, y: 0 };
export const lineupPlayerEnterEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function getLineupPlayerEnterTransition(
  index = 0,
  baseDelay = 0.15,
  step = 0.02,
  duration = 0.3
): Transition {
  return {
    delay: baseDelay + index * step,
    duration,
    ease: lineupPlayerEnterEase,
  };
}

export const lineupPlayerEnterVariants: Variants = {
  hidden: lineupPlayerEnterInitial,
  visible: (index = 0) => ({
    ...lineupPlayerEnterAnimate,
    transition: getLineupPlayerEnterTransition(index),
  }),
};
