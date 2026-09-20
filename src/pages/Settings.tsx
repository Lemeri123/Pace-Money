import { useEffect, useState } from 'react';
import { supabase, StudentProfile, BudgetCategory } from '../lib/supabase';
import { AppCurrency, amountFromInput, formatMoney, normalizeCurrency } from '../lib/currency';
import { getBudgetCategories, legacyBudgetFields, slugifyCategory } from '../lib/budgets';
import CurrencyToggle from '../components/CurrencyToggle';
import MoneyInput from '../components/MoneyInput';
import { Plus, Save, Trash2, LogOut } from 'lucide-react';

interface Props {
  profile: StudentProfile;
  onUpdate: (updated: StudentProfile) => void;
}

export default function Settings({ profile, onUpdate }: Props) {
  const [name, setName] = useState(profile.name);
  const [allowance, setAllowance] = useState(String(profile.monthly_allowance));
  const [sideIncome, setSideIncome] = useState(String(profile.monthly_side_income));
  const [budgets, setBudgets] = useState<BudgetCategory[]>(() => getBudgetCategories(profile));
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [currency, setCurrency] = useState<AppCurrency>(normalizeCurrency(profile.currency));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrency(normalizeCurrency(profile.currency));
  }, [profile.currency]);

  useEffect(() => {
    setBudgets(getBudgetCategories(profile));
  }, [profile.budget_categories, profile.user_id]);

  async function persistCurrency(next: AppCurrency) {
    setCurrency(next);
    await supabase.from('student_profiles').update({
      currency: next,
      updated_at: new Date().toISOString(),
    }).eq('user_id', profile.user_id);
    onUpdate({ ...profile, currency: next });
  }

  function updateBudget(id: string, patch: Partial<BudgetCategory>) {
    setBudgets(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));
  }

  function removeBudget(id: string) {
    setBudgets(prev => prev.filter(item => item.id !== id));
  }

  function addBudget() {
    const label = newName.trim();
    if (!label) return;
    const id = slugifyCategory(label, budgets.map(b => b.id));
    setBudgets(prev => [...prev, { id, name: label, amount: amountFromInput(newAmount) }]);
    setNewName('');
    setNewAmount('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const cleaned = budgets.map(item => ({
      id: item.id,
      name: item.name.trim() || item.id,
      amount: Number(item.amount) || 0,
    }));
    const updates = {
      name,
      monthly_allowance: amountFromInput(allowance),
      monthly_side_income: amountFromInput(sideIncome),
      ...legacyBudgetFields(cleaned),
      budget_categories: cleaned,
      currency,
      updated_at: new Date().toISOString(),
    };
    const { error: saveError } = await supabase.from('student_profiles').update(updates).eq('user_id', profile.user_id);
    setSaving(false);
    if (saveError) {
      if (/budget_categories/i.test(saveError.message)) {
        setError('Custom categories need a database column. In Supabase SQL Editor run: ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS budget_categories jsonb DEFAULT NULL;');
      } else {
        setError(saveError.message);
      }
      return;
    }
    onUpdate({ ...profile, ...updates });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const totalIncome = amountFromInput(allowance) + amountFromInput(sideIncome);
  const totalBudget = budgets.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const remaining = totalIncome - totalBudget;

  return (
    <div className="space-y-6 pb-24 md:pb-6 max-w-lg">
      <div>
        <h1 className="text-snow text-2xl font-bold">Settings</h1>
        <p className="text-mist text-sm mt-0.5">Update your profile and budget settings.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-deep border border-dusk rounded-2xl p-5 space-y-4">
          <h2 className="text-snow font-semibold">Currency</h2>
          <p className="text-mist text-sm">Switch how amounts are shown across the app.</p>
          <CurrencyToggle value={currency} onChange={persistCurrency} />
        </div>

        <div className="bg-deep border border-dusk rounded-2xl p-5 space-y-4">
          <h2 className="text-snow font-semibold">Profile</h2>
          <div>
            <label className="block text-snow text-sm font-medium mb-1.5">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-dusk border border-steel text-snow rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-steel focus:border-transparent"
            />
          </div>
        </div>

        <div className="bg-deep border border-dusk rounded-2xl p-5 space-y-4">
          <h2 className="text-snow font-semibold">Monthly Income</h2>
          {[
            { label: `Allowance (${currency})`, value: allowance, set: setAllowance },
            { label: `Side Income / Part-time (${currency})`, value: sideIncome, set: setSideIncome },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="block text-snow text-sm font-medium mb-1.5">{label}</label>
              <MoneyInput
                value={value}
                onChange={set}
                currency={currency}
              />
            </div>
          ))}
          {totalIncome > 0 && (
            <div className="bg-snow/10 border border-steel rounded-xl px-4 py-2.5 text-snow text-sm font-medium">
              Total income: {formatMoney(totalIncome, currency)}/month
            </div>
          )}
        </div>

        <div className="bg-deep border border-dusk rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-snow font-semibold">Monthly Budgets</h2>
            <p className="text-mist text-sm mt-0.5">Add your own categories or remove ones you do not use.</p>
          </div>

          {budgets.length === 0 && (
            <p className="text-mist text-sm">No budget categories yet. Add one below.</p>
          )}

          {budgets.map(item => (
            <div key={item.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <input
                  value={item.name}
                  onChange={e => updateBudget(item.id, { name: e.target.value })}
                  className="flex-1 bg-transparent text-snow text-sm font-medium focus:outline-none focus:text-snow"
                />
                <button
                  type="button"
                  onClick={() => removeBudget(item.id)}
                  className="text-steel hover:text-snow transition-colors p-1"
                  aria-label={`Delete ${item.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <MoneyInput
                value={item.amount || ''}
                onChange={raw => updateBudget(item.id, { amount: amountFromInput(raw) })}
                currency={currency}
              />
            </div>
          ))}

          <div className="border-t border-dusk pt-4 space-y-2">
            <label className="block text-snow text-sm font-medium">Add category</label>
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Rent, Data, Airtime"
                className="flex-1 bg-dusk border border-steel text-snow rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-steel focus:border-transparent placeholder-mist"
              />
              <MoneyInput
                value={newAmount}
                onChange={setNewAmount}
                currency={currency}
                placeholder={currency}
                className="w-28 bg-dusk border border-steel text-snow rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-steel focus:border-transparent placeholder-mist"
              />
            </div>
            <button
              type="button"
              onClick={addBudget}
              disabled={!newName.trim()}
              className="w-full flex items-center justify-center gap-1.5 bg-dusk hover:bg-steel disabled:opacity-40 text-snow font-medium py-2.5 rounded-xl text-sm transition-all border border-steel"
            >
              <Plus size={15} />
              Add category
            </button>
          </div>

          {totalIncome > 0 && (
            <div className={`rounded-xl px-4 py-2.5 text-sm font-medium border ${remaining >= 0 ? 'bg-dusk border-steel text-snow' : 'bg-steel/10 border-steel text-mist'}`}>
              {remaining >= 0
                ? `${formatMoney(remaining, currency)} unbudgeted (potential savings)`
                : `Over-budgeted by ${formatMoney(Math.abs(remaining), currency)}`}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-steel/10 border border-steel rounded-xl px-4 py-3 text-mist text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className={`w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-all text-sm ${
            saved ? 'bg-emerald-400 text-ink' : 'bg-glow hover:bg-glow/80 text-ink'
          } disabled:opacity-40`}
        >
          <Save size={15} />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </form>

      {/* Sign Out Button */}
      <button
        onClick={() => supabase.auth.signOut()}
        className="w-full flex items-center justify-center gap-2 bg-steel/20 hover:bg-steel/30 text-mist hover:text-snow font-medium py-3 rounded-xl transition-all text-sm border border-steel mt-4"
      >
        <LogOut size={15} />
        Sign Out
      </button>
    </div>
  );
}
