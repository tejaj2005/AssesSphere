import type { Variants } from 'framer-motion';

// ─── EASING CURVES ───
const productive: [number, number, number, number] = [0.22, 1, 0.36, 1];
const expressive: [number, number, number, number] = [0.34, 1.56, 0.64, 1];

// ─── PAGE TRANSITION ───
export const page: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: productive } },
};
// Legacy alias used across the codebase
export const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: 0.35, ease: productive },
};

// ─── STAGGER ───
export const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};
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
export const drawer: Variants = {
  hidden: { x: '100%', opacity: 0.8 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', damping: 30, stiffness: 300 } },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
};
export const drawerTransition: Variants = {
  initial: { x: '100%', opacity: 0.8 },
  animate: { x: 0, opacity: 1, transition: { type: 'spring', damping: 30, stiffness: 300 } },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
};

// ─── MODAL ───
export const modal: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: productive } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.15 } },
};
export const modalTransition: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: productive } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.15 } },
};

// ─── OVERLAY ───
export const overlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// ─── FADE SCALE ───
export const fadeScale: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 4 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: productive } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.12 } },
};
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
};

// ─── SIDEBAR ───
export const sidebarWidth = {
  expanded: { width: 256, transition: { duration: 0.25, ease: productive } },
  collapsed: { width: 68, transition: { duration: 0.25, ease: productive } },
};

export const sidebarText: Variants = {
  expanded: { opacity: 1, x: 0, transition: { delay: 0.08, duration: 0.18 } },
  collapsed: { opacity: 0, x: -8, transition: { duration: 0.12 } },
};

// ─── COUNT-UP ───
export const countUpConfig = { stiffness: 80, damping: 20, duration: 0.8 };

// ─── SKELETON ───
export const SKELETON_DURATION_MS = 400;
export const SKELETON_FADE_MS = 200;

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

// ─── EXPAND / COLLAPSE ───
export const expand: Variants = {
  hidden: { height: 0, opacity: 0, overflow: 'hidden' },
  visible: { height: 'auto', opacity: 1, transition: { height: { duration: 0.25 }, opacity: { duration: 0.2, delay: 0.05 } } },
  exit: { height: 0, opacity: 0, transition: { height: { duration: 0.2 }, opacity: { duration: 0.1 } } },
};

// ─── TAB CONTENT ───
export const tabContent: Variants = {
  hidden: { opacity: 0, x: 8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2, ease: productive } },
  exit: { opacity: 0, x: -8, transition: { duration: 0.12 } },
};

// ─── BULK TOOLBAR ───
export const toolbar: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 24, stiffness: 260 } },
  exit: { opacity: 0, y: 8, transition: { duration: 0.15 } },
};
