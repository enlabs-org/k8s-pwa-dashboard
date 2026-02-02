import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [isManual, setIsManual] = useState(() => localStorage.getItem('theme') !== null);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!isManual) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isManual]);

  useEffect(() => {
    if (isManual) {
      localStorage.setItem('theme', theme);
    }
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme, isManual]);

  const toggleTheme = () => {
    setIsManual(true);
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

// Theme colors
export const colors = {
  light: {
    bg: '#f3f4f6',
    bgCard: '#ffffff',
    bgHeader: '#1e293b',
    text: '#111827',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    inputBg: '#ffffff',
    inputBorder: '#d1d5db',
  },
  dark: {
    bg: '#111827',
    bgCard: '#1f2937',
    bgHeader: '#0f172a',
    text: '#f9fafb',
    textSecondary: '#9ca3af',
    border: '#374151',
    inputBg: '#374151',
    inputBorder: '#4b5563',
  },
};
