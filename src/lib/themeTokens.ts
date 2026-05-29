/**
 * AssessSphere brand theme tokens.
 * Use these constants in JS/TS code. CSS variables in `index.css` mirror them
 * (see :root { --primary, --accent, ... }).
 */
export const THEME = {
  // Brand
  primary:        '#0e5467', // Dark Azure
  primaryDark:    '#0a3d4d', // Sidebar / dark surfaces
  accent:         '#f5af12', // Golden Orange
  accentHover:    '#dc9c0c', // Accent hover (10% darker)

  // Surfaces
  base:           '#ffffff',
  mutedSurface:   '#e8f4f7', // Table row stripes, subtle BGs
  border:         '#c2dde4',

  // Text
  textOnDark:     '#ffffff',
  textOnLight:    '#0e5467',
  textMuted:      '#5a8a97',

  // Semantic
  danger:         '#d9534f',
  dangerStrong:   '#8b0000', // Critical
  warning:        '#f5af12',
  success:        '#2e9e6b',
} as const;
