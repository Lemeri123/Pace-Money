import { useEffect, useState } from 'react';
import { supabase, StudentProfile, Streak } from './lib/supabase';
import { AppCurrency } from './lib/currency';
import { useTheme } from './lib/useTheme';
import type { User } from '@supabase/supabase-js';
import AuthPage from './components/AuthPage';
import Onboarding from './components/Onboarding';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SpendingTracker from './pages/SpendingTracker';
import AICoach from './pages/AICoach';
import SavingsGoals from './pages/SavingsGoals';
import Settings from './pages/Settings';

type Page = 'dashboard' | 'tracker' | 'coach' | 'goals' | 'settings';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<Page>('dashboard');
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    let lastUserId: string | null = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      
      // Only reload profile if the user actually changed
      if (u && u.id !== lastUserId) {
        lastUserId = u.id;
        loadProfile(u.id);
      } else if (!u) {
        lastUserId = null;
        setProfile(null);
        setStreak(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    setLoading(true);
    try {
      const [profileRes, streakRes] = await Promise.all([
        supabase.from('student_profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('streaks').select('*').eq('user_id', userId).maybeSingle(),
      ]);
      setProfile(profileRes.data ?? null);
      setStreak(streakRes.data ?? null);
    } catch {
      setProfile(null);
      setStreak(null);
    } finally {
      setLoading(false);
    }
  }

  async function changeCurrency(currency: AppCurrency) {
    if (!profile) return;
    setProfile({ ...profile, currency });
    await supabase.from('student_profiles').update({
      currency,
      updated_at: new Date().toISOString(),
    }).eq('user_id', profile.user_id);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-glow rounded-xl flex items-center justify-center animate-pulse">
            <img src="/logo.png" alt="CentsAble Logo" className="w-8 h-8 object-contain"/>   
          </div>
          <div className="text-mist text-sm">Loading PaceMoney...</div>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;
  if (!profile?.onboarded) {
    const displayName = (user.user_metadata?.name as string | undefined)
      || user.email?.split('@')[0]
      || '';
    return <Onboarding userId={user.id} displayName={displayName} onComplete={() => loadProfile(user.id)} />;
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard profile={profile} onNavigate={setPage} />;
      case 'tracker': return <SpendingTracker profile={profile} />;
      case 'coach': return <AICoach profile={profile} />;
      case 'goals': return <SavingsGoals profile={profile} />;
      case 'settings': return <Settings profile={profile} onUpdate={p => setProfile(p)} />;
    }
  };

  return (
    <Layout
      current={page}
      onNavigate={setPage}
      streakCount={streak?.current_streak ?? 0}
      currency={profile.currency}
      onCurrencyChange={changeCurrency}
      theme={theme}
      onThemeToggle={toggleTheme}
    >
      {renderPage()}
    </Layout>
  );
}
