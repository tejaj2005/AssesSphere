import type { Variants } from 'framer-motion';

// ─── EASING CURVES ───
const productive: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ─── PAGE TRANSITION ───
export const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: 0.35, ease: productive },
};

// ─── STAGGER ───
export const staggerContainer: Variants = {
  animate: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: productive } },
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: productive } },
};

// ─── DRAWER ───
export const drawerTransition: Variants = {
  initial: { x: '100%', opacity: 0.8 },
  animate: { x: 0, opacity: 1, transition: { type: 'spring', damping: 30, stiffness: 300 } },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
};

// ─── MODAL ───
export const modalTransition: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: productive } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.15 } },
};

// ─── SIDEBAR ───
export const sidebarText: Variants = {
  expanded: { opacity: 1, x: 0, transition: { delay: 0.08, duration: 0.18 } },
  collapsed: { opacity: 0, x: -8, transition: { duration: 0.12 } },
};

// ─── HOVER & PRESS ───
export const hover = {
  lift: { y: -1, transition: { duration: 0.2, ease: productive } },
  press: { scale: 0.97, transition: { duration: 0.1 } },
};

// ─── URGENT PULSE ───
export const urgentPulse: Variants = {
  animate: { scale: [1, 1.04, 1], transition: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' } },
};
export const pendingPulse: Variants = {
  animate: { scale: [1, 1.04, 1], transition: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' } },
};
