import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';
type ThemeSetting = 'light' | 'dark' | 'system';

interface ThemeContextType {
  /** Resolved theme currently applied to the document. */
  theme: Theme;
  /** The user's preference — 'system' follows the OS. */
  themeSetting: ThemeSetting;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  setThemeSetting: (s: ThemeSetting) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const systemPrefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

const resolve = (setting: ThemeSetting): Theme =>
  setting === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : setting;

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeSetting, setThemeSettingState] = useState<ThemeSetting>(() => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem('pqas_theme_setting') as ThemeSetting | null) || 'system';
  });
  const [theme, setThemeState] = useState<Theme>(() => resolve(themeSetting));

  // Apply resolved theme to <html> + persist the user's preference.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('pqas_theme_setting', themeSetting);
  }, [theme, themeSetting]);

  // When following the system, keep the resolved theme in sync with OS changes.
  useEffect(() => {
    if (themeSetting !== 'system') {
      setThemeState(themeSetting);
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => setThemeState(mq.matches ? 'dark' : 'light');
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [themeSetting]);

  const setThemeSetting = (s: ThemeSetting) => setThemeSettingState(s);
  const setTheme = (t: Theme) => setThemeSettingState(t);
  const toggleTheme = () => setThemeSettingState(theme === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, themeSetting, toggleTheme, setTheme, setThemeSetting }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
