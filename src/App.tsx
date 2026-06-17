import { Moon, Sun } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import AgentsMapPage from '@/pages/AgentsMapPage';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Переключить тему"
      className={`fixed right-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition-colors ${
        isDark
          ? 'border-obsidian-700 bg-obsidian-900 text-amber-300 hover:bg-obsidian-800'
          : 'border-obsidian-200 bg-white text-obsidian-600 hover:bg-obsidian-100'
      }`}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen">
        <ThemeToggle />
        <AgentsMapPage />
      </div>
      <Toaster position="top-right" />
    </ThemeProvider>
  );
}
