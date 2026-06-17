import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '.dark-theme'],
  // Акцентные «точки» цвета в редакторе строятся динамически (bg-${c}-500) —
  // защищаем их от очистки JIT.
  safelist: [
    'bg-cyan-500', 'bg-teal-500', 'bg-amber-500', 'bg-emerald-500', 'bg-fuchsia-500',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Кастомная палитра obsidian (slate-совместимая).
        obsidian: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
