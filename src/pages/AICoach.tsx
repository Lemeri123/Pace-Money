import { useState, useEffect } from 'react';
import { StudentProfile } from '../lib/supabase';
import { canIAfford, getBudgetAdvice } from '../lib/aiCoach';
import { formatMoney, amountFromInput } from '../lib/currency';
import { getBudgetCategories } from '../lib/budgets';
import MoneyInput from '../components/MoneyInput';
import { Send, DollarSign, MessageSquare, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  profile: StudentProfile;
}

const QUICK_PROMPTS = [
  { label: 'Budget advice', text: 'Give me tips to improve my budget this month.' },
  { label: 'Save more', text: 'How can I save more money as a student?' },
  { label: 'Side hustle', text: 'What are good side hustles for students?' },
  { label: 'Emergency fund', text: 'How do I build an emergency fund on a student budget?' },
];

const STORAGE_KEY = 'ai-coach-messages';

export default function AICoach({ profile }: Props) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [{
          id: '0',
          role: 'assistant',
          content: `Hey${profile.name ? ` ${profile.name}` : ''}! 👋 I'm your AI financial coach. Ask me anything about your money — like "Can I afford AirPods?" or "How do I save for a trip?" You can also use the affordability checker below!`,
        }];
      }
    }
    return [{
      id: '0',
      role: 'assistant',
      content: `Hey${profile.name ? ` ${profile.name}` : ''}! 👋 I'm your AI financial coach. Ask me anything about your money — like "Can I afford AirPods?" or "How do I save for a trip?" You can also use the affordability checker below!`,
    }];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // Affordability checker
  const [showAfford, setShowAfford] = useState(true);
  const [itemName, setItemName] = useState('');
  const [itemCost, setItemCost] = useState('');
  const [affordResult, setAffordResult] = useState('');
  const [checkingAfford, setCheckingAfford] = useState(false);

  async function sendMessage(text?: string) {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    setLoading(true);

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);

    try {
      const result = await getBudgetAdvice(profile, msg);
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.message || "I couldn't generate advice right now. Try again!",
      };
      setMessages(prev => [...prev, reply]);
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    }
    setLoading(false);
  }

  async function checkAffordability() {
    if (!itemName.trim() || !itemCost) return;
    setCheckingAfford(true);
    setAffordResult('');
    try {
      const result = await canIAfford({ name: itemName.trim(), cost: amountFromInput(itemCost) }, profile);
      setAffordResult(result.message || 'Unable to determine affordability.');
    } catch {
      setAffordResult('Could not check affordability. Try again.');
    }
    setCheckingAfford(false);
  }

  const totalIncome = profile.monthly_allowance + profile.monthly_side_income;
  const topBudgets = getBudgetCategories(profile).filter(b => b.amount > 0).slice(0, 2);

  return (
    <div className="flex flex-col min-w-0 space-y-4 pb-6">
      <div className="min-w-0 pr-0">
        <h1 className="text-snow text-xl sm:text-2xl font-bold">AI Coach</h1>
        <p className="text-mist text-sm mt-0.5">Your personal student finance advisor</p>
      </div>

      {/* Can I Afford This? */}
      <div className="bg-deep border border-dusk rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowAfford(!showAfford)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left"
        >
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-snow" />
            <span className="text-snow font-semibold">Can I Afford This?</span>
          </div>
          {showAfford ? <ChevronUp size={16} className="text-mist" /> : <ChevronDown size={16} className="text-mist" />}
        </button>

        {showAfford && (
          <div className="px-4 pb-4 space-y-3 border-t border-dusk pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={itemName}
                onChange={e => setItemName(e.target.value)}
                placeholder="What do you want to buy?"
                className="w-full min-w-0 bg-dusk border border-steel text-snow rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-steel focus:border-transparent placeholder-mist"
              />
              <MoneyInput
                value={itemCost}
                onChange={setItemCost}
                currency={profile.currency}
                placeholder="0"
                className="w-full sm:w-32 min-w-0 bg-dusk border border-steel text-snow rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-steel focus:border-transparent placeholder-mist"
              />
            </div>
            <button
              onClick={checkAffordability}
              disabled={checkingAfford || !itemName.trim() || !itemCost}
              className="w-full bg-glow hover:bg-glow/80 disabled:opacity-40 text-ink font-semibold py-2.5 rounded-xl text-sm transition-all"
            >
              {checkingAfford ? 'Checking...' : 'Check Affordability'}
            </button>
            {affordResult && (
              <div className="bg-dusk border border-steel rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <Sparkles size={14} className="text-snow mt-0.5 flex-shrink-0" />
                  <p className="text-snow text-sm leading-relaxed">{affordResult}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="bg-deep border border-dusk rounded-2xl flex flex-col flex-1 min-h-0" style={{ minHeight: '320px' }}>
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-dusk">
          <MessageSquare size={15} className="text-snow" />
          <span className="text-snow font-semibold text-sm">Chat with your Coach</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 bg-snow/10 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                  <Sparkles size={12} className="text-snow" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed break-words ${
                msg.role === 'user'
                  ? 'bg-glow text-ink rounded-br-sm'
                  : 'bg-dusk text-snow rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 bg-snow/10 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                <Sparkles size={12} className="text-snow animate-pulse" />
              </div>
              <div className="bg-dusk rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-mist rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-mist rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-mist rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick prompts */}
        <div className="px-4 py-2 border-t border-dusk flex gap-2 overflow-x-auto overscroll-x-contain scrollbar-hide min-w-0">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p.label}
              onClick={() => sendMessage(p.text)}
              disabled={loading}
              className="flex-shrink-0 text-xs px-3 py-1.5 bg-dusk hover:bg-steel text-mist hover:text-snow border border-steel rounded-xl transition-all disabled:opacity-40"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-dusk flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask your AI coach anything..."
            disabled={loading}
            className="flex-1 bg-dusk border border-steel text-snow rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-steel focus:border-transparent placeholder-mist"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="bg-glow hover:bg-glow/80 disabled:opacity-40 text-ink p-2.5 rounded-xl transition-all"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
