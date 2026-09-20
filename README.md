# Pace Money 💸

> An AI-powered financial coach built for students. Track spending, roast your habits, and actually save money.

---

## Features

- **Spending Tracker** — log transactions with AI auto-categorization across 8 categories
- **Roast Me** — AI humorously calls out your bad spending habits
- **AI Coach Chat** — ask anything: "Can I afford AirPods?" or "How do I save for a trip?"
- **Savings Goals** — set goals with deadlines, custom emojis, and color themes
- **Budget Tracking** — visual breakdown of spending vs. budget per category
- **Streaks & Achievements** — 9 unlockable achievements and daily logging streaks
- **Onboarding Wizard** — 3-step setup for income and budget limits
- **Mobile Ready** — responsive design with bottom navigation for mobile devices

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS (with CSS variables for theming) |
| Auth + Database | Supabase (PostgreSQL + RLS) |
| AI | Groq API — `llama-3.3-70b-versatile` |
| Mobile | Capacitor (for Android/iOS builds) |

---

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd <repo-folder>
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Then fill in your `.env`:

| Variable | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API → anon public key |
| `VITE_GROQ_API_KEY` | [console.groq.com](https://console.groq.com) — free account |

### 3. Set up the database

In your Supabase project, open the **SQL Editor** and run the migrations in order:

1. First, run `supabase/migrations/20260527072908_create_financial_coach_schema.sql`
2. Then, run `supabase/migrations/20260914100000_add_budget_categories.sql`

This creates all tables with RLS policies:

- `student_profiles` — user settings, income, currency preference
- `transactions` — spending logs with categories
- `savings_goals` — goal tracking with progress
- `achievements` — unlockable badges
- `streaks` — daily logging streak counter

**Alternative:** If you have the Supabase CLI installed:

```bash
supabase db push
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Building for Android

To test on an Android device:

### Option 1: Browser Testing (Fastest)

Run with network access and open on your phone's browser:

```bash
npm run dev -- --host
```

Find your local IP in the terminal output (e.g., `http://192.168.x.x:5173`) and open it in Chrome on your Android device.

### Option 2: Native APK (Full Native Experience)

Requires [Android Studio](https://developer.android.com/studio) installed.

1. **Build the web app:**
   ```bash
   npm run build
   ```

2. **Sync with Capacitor:**
   ```bash
   npx cap sync
   ```

3. **Open in Android Studio:**
   ```bash
   export CAPACITOR_ANDROID_STUDIO_PATH=/snap/bin/android-studio
   npx cap open android
   ```

4. In Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)**

5. Transfer the `.apk` file to your phone and install it (enable "Install from unknown sources" in Android settings).

---

## Project Structure

```
src/
├── components/
│   ├── AuthPage.tsx          # Sign in / sign up
│   ├── Layout.tsx            # Sidebar + mobile nav + theme toggle
│   ├── Onboarding.tsx        # 3-step setup wizard
│   ├── CurrencyToggle.tsx    # Currency switcher component
│   └── MoneyInput.tsx        # Currency-aware input field
├── pages/
│   ├── Dashboard.tsx         # Monthly overview + AI insights
│   ├── SpendingTracker.tsx   # Log + manage transactions
│   ├── AICoach.tsx           # Chat + affordability checker
│   ├── SavingsGoals.tsx      # Goals + achievements
│   └── Settings.tsx          # Profile + budget settings
├── lib/
│   ├── supabase.ts           # Supabase client + types
│   ├── aiCoach.ts            # Groq API calls
│   ├── achievements.ts       # Streak + achievement logic
│   ├── budgets.ts            # Budget calculations
│   ├── currency.ts           # Currency conversion utilities
│   └── useTheme.ts           # Dark/light mode hook
└── index.css                 # Global styles + CSS variables for theming
```

---

## Authentication

This app uses **username + password authentication** (no email required):

- Users create an account with a username (3+ characters) and password (6+ characters)
- No email confirmation needed - instant signup
- Usernames are stored in user metadata and visible in Supabase dashboard
- Internally converts usernames to email format (`username@pacemoney.app`) for Supabase compatibility

**To view users in Supabase:**
- Go to **Authentication → Users** in your dashboard
- You'll see entries like `john@pacemoney.app` - the username is the part before `@`
- Or check the **User Metadata** column to see the actual username

---

## Environment Variables

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GROQ_API_KEY=your_groq_api_key
```