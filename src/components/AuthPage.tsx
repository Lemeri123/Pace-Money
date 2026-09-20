import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/useTheme';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { theme, toggle } = useTheme();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: undefined,
        }
      });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      {/* Theme Toggle */}
      <button
        onClick={toggle}
        className="fixed top-4 right-4 w-10 h-10 bg-deep border border-dusk rounded-xl flex items-center justify-center hover:bg-dusk transition-colors"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <Sun size={18} className="text-glow" />
        ) : (
          <Moon size={18} className="text-snow" />
        )}
      </button>

      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left: Branding */}
        <div className="text-snow space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-25 h-25 rounded-xl flex items-center justify-center">
              <img src="/logo.png" alt="CentsAble Logo" className="w-8 h-8"/>   
            </div>
            <span className="text-2xl font-semibold tracking-tight">Pace Money</span>
          </div>
          <h1 className="text-4xl font-semibold leading-tight">
            Your Personal Financial<br />
            <span className="text-glow">App</span>
          </h1>
          <p className="text-mist text-lg leading-relaxed">
            Budget smarter, save faster, plan expenses and track spending.
          </p>
        </div>

        {/* Right: Auth form */}
        <div className="bg-deep border border-dusk rounded-2xl p-8 shadow-2xl">
          <h2 className="text-snow text-2xl font-semibold mb-1">
            {mode === 'signin' ? 'Welcome back' : 'Get started free'}
          </h2>
          <p className="text-mist text-sm mb-6">
            {mode === 'signin' ? 'Sign in to your account' : 'Create your free account'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-snow text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-dusk border border-steel text-snow rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-steel focus:border-transparent placeholder-mist"
              />
            </div>
            <div>
              <label className="block text-snow text-sm font-medium mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full bg-dusk border border-steel text-snow rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-steel focus:border-transparent placeholder-mist"
              />
            </div>

            {error && (
              <div className="bg-dusk border border-steel text-snow rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-glow hover:bg-glow/80 disabled:opacity-50 text-ink font-semibold py-3 rounded-xl transition-all duration-150 text-sm"
            >
              {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-mist text-sm mt-6">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
              className="text-snow hover:text-mist font-medium transition-colors"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
