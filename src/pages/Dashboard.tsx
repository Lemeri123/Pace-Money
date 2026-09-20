import { useEffect, useState } from 'react';
import { supabase, StudentProfile, Transaction, SavingsGoal, Streak } from '../lib/supabase';
import { analyzeSpending } from '../lib/aiCoach';
import { formatMoney } from '../lib/currency';
import { getBudgetCategories } from '../lib/budgets';
import { TrendingDown, TrendingUp, Target, Zap, Sparkles, RefreshCw, LogOut } from 'lucide-react';


interface Props {
  profile: StudentProfile;
  onNavigate: (page: 'dashboard' | 'tracker' | 'coach' | 'goals' | 'settings') => void;
}

export default function Dashboard({ profile, onNavigate }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [aiInsight, setAiInsight] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  const totalIncome = profile.monthly_allowance + profile.monthly_side_income;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const [txRes, goalRes, streakRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', profile.user_id).gte('transaction_date', startOfMonth).order('transaction_date', { ascending: false }),
      supabase.from('savings_goals').select('*').eq('user_id', profile.user_id).eq('completed', false).order('created_at', { ascending: false }),
      supabase.from('streaks').select('*').eq('user_id', profile.user_id).maybeSingle(),
    ]);

    setTransactions(txRes.data || []);
    setGoals(goalRes.data || []);
    setStreak(streakRes.data);
  }

  async function fetchInsight() {
    if (!transactions.length) return;
    setLoadingInsight(true);
    try {
      const result = await analyzeSpending(transactions, profile);
      setAiInsight(result.message || '');
    } catch {
      setAiInsight('Unable to fetch AI insights right now.');
    }
    setLoadingInsight(false);
  }

  const totalSpent = transactions.reduce((s, t) => s + t.amount, 0);
  const remaining = totalIncome - totalSpent;

  const categoryTotals: Record<string, number> = {};
  for (const t of transactions) {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  }
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  const budgetCategories = getBudgetCategories(profile).filter(c => c.amount > 0);

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-snow text-2xl font-semibold">Hey{profile.name ? `, ${profile.name}` : ''} 👋</h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Monthly Income" value={formatMoney(totalIncome, profile.currency)} icon={<TrendingUp size={18} className="text-emerald-400" />} accent="emerald" />
        <StatCard label="Spent This Month" value={formatMoney(totalSpent, profile.currency)} icon={<TrendingDown size={18} className="text-rose-400" />} accent="rose" />
        <StatCard label="Remaining" value={formatMoney(remaining, profile.currency)} icon={<Zap size={18} className="text-sky-400" />} accent="sky" />
        <StatCard label="Active Goals" value={String(goals.length)} icon={<Target size={18} className="text-glow" />} accent="amber" />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Spending breakdown */}
        <div className="bg-deep border border-dusk rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-snow font-semibold">Spending Breakdown</h2>
            <span className="text-mist text-xs">{new Date().toLocaleString('default', { month: 'long' })}</span>
          </div>
          {sortedCategories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-mist text-sm">No transactions yet</p>
              <button onClick={() => onNavigate('tracker')} className="mt-3 text-snow text-sm hover:text-mist transition-colors">
                Add your first transaction →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedCategories.map(([cat, amount]) => (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-snow capitalize">{cat}</span>
                    <span className="text-snow font-medium">{formatMoney(amount, profile.currency)}</span>
                  </div>
                  <div className="h-2 bg-dusk rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-glow transition-all duration-500`}
                      style={{ width: `${Math.min((amount / totalSpent) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Budget usage */}
        <div className="bg-deep border border-dusk rounded-2xl p-5">
          <h2 className="text-snow font-semibold mb-4">Budget Usage</h2>
          {budgetCategories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-mist text-sm">No budgets set</p>
              <button onClick={() => onNavigate('settings')} className="mt-3 text-snow text-sm hover:text-mist transition-colors">
                Set up budgets →
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {budgetCategories.map(({ id, name, amount: budget }) => {
                const spent = categoryTotals[id] || 0;
                const pct = Math.min((spent / budget) * 100, 100);
                const over = spent > budget;
                return (
                  <div key={id}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-snow">{name}</span>
                      <span className={over ? 'text-rose-400 font-medium' : 'text-mist'}>
                        {formatMoney(spent, profile.currency)} / {formatMoney(budget, profile.currency)}
                      </span>
                    </div>
                    <div className="h-2 bg-dusk rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-rose-500' : pct > 80 ? 'bg-glow' : 'bg-glow'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Streak + Goals preview */}
      <div className="grid md:grid-cols-2 gap-5">
        {streak && streak.current_streak > 0 && (
          <div className="bg-gradient-to-br from-orange-600/20 to-glow/10 border border-orange-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🔥</span>
              <div>
                <div className="text-snow font-bold text-xl">{streak.current_streak} Day Streak!</div>
                <div className="text-orange-300/80 text-sm">Best: {streak.longest_streak} days</div>
              </div>
            </div>
            <p className="text-orange-100/70 text-sm">You've logged spending {streak.total_days_logged} days total. Keep going!</p>
          </div>
        )}

        {goals.length > 0 && (
          <div className="bg-deep border border-dusk rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-snow font-semibold">Top Goal</h2>
              <button onClick={() => onNavigate('goals')} className="text-emerald-400 text-xs hover:text-emerald-300">View all →</button>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{goals[0].emoji}</span>
                <span className="text-snow font-medium">{goals[0].title}</span>
              </div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-mist">{formatMoney(goals[0].current_amount, profile.currency)} saved</span>
                <span className="text-mist">{formatMoney(goals[0].target_amount, profile.currency)} goal</span>
              </div>
              <div className="h-2.5 bg-dusk rounded-full overflow-hidden">
                <div
                  className="h-full bg-glow rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((goals[0].current_amount / goals[0].target_amount) * 100, 100)}%` }}
                />
              </div>
              <div className="text-right text-xs text-mist mt-1">
                {Math.round((goals[0].current_amount / goals[0].target_amount) * 100)}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Insights */}
      <div className="bg-deep border border-dusk rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-snow" />
            <h2 className="text-snow font-semibold">AI Insights</h2>
          </div>
          <button
            onClick={fetchInsight}
            disabled={loadingInsight || transactions.length === 0}
            className="flex items-center gap-1.5 text-snow hover:text-mist text-xs font-medium disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={13} className={loadingInsight ? 'animate-spin' : ''} />
            {loadingInsight ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
        {aiInsight ? (
          <p className="text-snow text-sm leading-relaxed whitespace-pre-line">{aiInsight}</p>
        ) : (
          <p className="text-mist text-sm">
            {transactions.length === 0
              ? 'Add some transactions first, then click Analyze for personalized AI insights.'
              : 'Click Analyze to get personalized spending insights from your AI coach.'}
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent: 'emerald' | 'rose' | 'sky' | 'amber' }) {
  const accentMap = {
    emerald: 'border-l-emerald-500 bg-emerald-500/5',
    rose:    'border-l-rose-500 bg-rose-500/5',
    sky:     'border-l-sky-500 bg-sky-500/5',
    amber:   'border-l-glow bg-glow/5',
  };
  return (
    <div className={`bg-deep border border-dusk border-l-2 ${accentMap[accent]} rounded-2xl p-4`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-mist text-xs tracking-wide">{label}</span></div>
      <div className="text-snow text-xl font-semibold">{value}</div>
    </div>
  );
}
