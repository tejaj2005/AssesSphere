import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'] },
      colors: {
        // ─── shadcn compatibility (use CSS vars) ───
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        success: { DEFAULT: 'hsl(var(--success))', bg: 'hsl(var(--success-bg))' },
        warning: { DEFAULT: 'hsl(var(--warning))', bg: 'hsl(var(--warning-bg))' },
        danger: { DEFAULT: 'hsl(var(--danger))', bg: 'hsl(var(--danger-bg))' },
        sidebar: { DEFAULT: 'hsl(var(--sidebar-bg))', hover: 'hsl(var(--sidebar-hover))', active: 'hsl(var(--sidebar-active))' },
        gold: { DEFAULT: 'hsl(var(--gold))', foreground: 'hsl(var(--gold-foreground))' },

        // ─── BRAND — AssessSphere (Dark Azure + Golden Orange) ───
        brand: {
          50:  '#E8F4F7',   // muted surface
          100: '#C2DDE4',   // border
          200: '#9CC4CE',
          300: '#6BA4B3',
          400: '#3F8497',
          500: '#0e5467',   // PRIMARY — Dark Azure
          600: '#0a3d4d',   // sidebar / dark surface
          700: '#073544',
          800: '#052B36',
          900: '#031D24',
          950: '#01101A',
        },
        gold: {
          DEFAULT: '#f5af12',
          50: '#FEF7E2', 100: '#FCEAB1', 200: '#FADC85', 300: '#F8C952',
          400: '#F6BC29', 500: '#f5af12', 600: '#DC9C0C', 700: '#A77506',
          800: '#714F03', 900: '#3A2901',
          foreground: '#0a3d4d',
        },

        // ─── SURFACES ───
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F8FAFC',
          tertiary: '#F1F5F9',
          muted: '#E2E8F0',
        },

        // ─── STATUS (quality traffic light) ───
        status: {
          green: { 50: '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0', 500: '#10B981', 600: '#059669', 700: '#047857' },
          amber: { 50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 500: '#F59E0B', 600: '#D97706', 700: '#B45309' },
          red:   { 50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C' },
        },

        // ─── TEXT ───
        ink: {
          DEFAULT: '#0F172A',
          secondary: '#475569',
          muted: '#94A3B8',
          inverted: '#F8FAFC',
        },

        // ─── SIDEBAR ───
        nav: {
          bg: '#0B1120',
          surface: '#131C2E',
          active: '#1A2744',
          border: '#1E2D45',
          text: '#7B8CA6',
          'text-hover': '#B8C5D6',
          'text-active': '#FFFFFF',
          accent: '#3B82F6',
        },

        // ─── ROLE ─── (used inline; not a TS object accessible via class — use direct utility classes per role)
      },
      borderRadius: { lg: '0.5rem', md: '0.375rem', sm: '0.25rem', xl: '0.75rem', '2xl': '1rem' },
      letterSpacing: {
        'sidebar-label': '0.08em',
        'table-header': '0.06em',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.06)',
        'drawer': '-20px 0 60px rgba(0,0,0,0.12)',
        'dropdown': '0 8px 24px rgba(0,0,0,0.08)',
        'modal': '0 16px 48px rgba(0,0,0,0.12)',
        'toast': '0 4px 16px rgba(0,0,0,0.08)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        shimmer: 'shimmer 1.5s infinite',
      },
      transitionTimingFunction: {
        productive: 'cubic-bezier(0.22, 1, 0.36, 1)',
        expressive: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
