import { TrendingUp, LayoutDashboard, Receipt, MessageSquare, Target, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AppCurrency, normalizeCurrency } from '../lib/currency';
import CurrencyToggle from './CurrencyToggle';
import type { Theme } from '../lib/useTheme';

type Page = 'dashboard' | 'tracker' | 'coach' | 'goals' | 'settings';

interface Props {
  current: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
  streakCount?: number;
  currency?: string;
  onCurrencyChange?: (currency: AppCurrency) => void;
  theme?: Theme;
  onThemeToggle?: () => void;
}

const navItems: { id: Page; icon: typeof LayoutDashboard; label: string }[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'tracker', icon: Receipt, label: 'Tracker' },
  { id: 'coach', icon: MessageSquare, label: 'AI Coach' },
  { id: 'goals', icon: Target, label: 'Goals' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export default function Layout({ current, onNavigate, children, streakCount = 0, currency, onCurrencyChange, theme, onThemeToggle }: Props) {
  return (
    <div className="min-h-screen bg-ink dark:bg-ink flex">
      {/* Sidebar */}
      <aside className="w-60 bg-deep dark:bg-deep border-r border-dusk dark:border-dusk flex flex-col fixed h-full z-10 hidden md:flex">
        <div className="p-5 border-b border-dusk">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-glow rounded-lg flex items-center justify-center">
              <img src="/logo.png" alt="CentsAble Logo" className="w-8 h-8 object-contain"/>
            </div>
            <span className="text-snow font-semibold text-base tracking-tight">Pace Money</span>
          </div>
        </div>

        {onCurrencyChange && (
          <div className="px-3 pt-3">
            <CurrencyToggle
              size="sm"
              value={normalizeCurrency(currency)}
              onChange={onCurrencyChange}
            />
          </div>
        )}

        {streakCount > 0 && (
          <div className="mx-3 mt-3 bg-dusk border border-steel rounded-xl px-3 py-2.5 flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <div>
              <div className="text-snow font-bold text-sm">{streakCount} day streak</div>
              <div className="text-mist text-xs">Keep it up!</div>
            </div>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1 mt-2">
          {navItems.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                ${current === id
                  ? 'bg-glow/10 text-glow border border-glow/25'
                  : 'text-mist hover:text-snow hover:bg-dusk'}`}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-dusk dark:border-dusk space-y-1">
          {onThemeToggle && (
            <button
              onClick={onThemeToggle}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-mist hover:text-snow hover:bg-dusk transition-all"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
          )}
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-mist hover:text-snow hover:bg-dusk transition-all"
          >
            <LogOut size={17} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-60 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        {onCurrencyChange && (
          <div className="md:hidden sticky top-0 z-20 bg-ink/95 dark:bg-ink/95 backdrop-blur border-b border-dusk px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-glow rounded-md flex items-center justify-center">
                <TrendingUp size={12} className="text-ink" />
              </div>
              <span className="text-snow font-semibold text-sm truncate">Pace Money</span>
            </div>
            <div className="flex items-center gap-2">
              {onThemeToggle && (
                <button
                  onClick={onThemeToggle}
                  className="p-1.5 rounded-lg text-mist hover:text-snow hover:bg-dusk transition-all"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              )}
              <CurrencyToggle
                size="sm"
                value={normalizeCurrency(currency)}
                onChange={onCurrencyChange}
              />
            </div>
          </div>
        )}
        <div className="flex-1 p-4 pb-24 md:p-6 md:pb-6 max-w-5xl w-full mx-auto min-w-0">
          {children}
        </div>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-deep border-t border-dusk flex w-full max-w-full overflow-hidden safe-area-bottom">
          {navItems.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 py-2 px-0.5 text-[10px] leading-tight font-medium transition-colors
                ${current === id ? 'text-glow' : 'text-mist'}`}
            >
              <Icon size={16} />
              <span className="truncate w-full text-center">{id === 'coach' ? 'Coach' : label}</span>
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
}
