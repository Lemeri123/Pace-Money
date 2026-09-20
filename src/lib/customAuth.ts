import { supabase } from './supabase';

interface AuthUser {
  id: string;
  username: string;
}

// Simple password hashing (use a proper library in production)
function hashPassword(password: string): string {
  return btoa(password + 'salt'); // Basic encoding - replace with bcrypt in production
}

export async function signUp(username: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    // Check if username already exists in localStorage users
    const users = getStoredUsers();
    if (users[username]) {
      return { user: null, error: 'Username already exists' };
    }

    // Create anonymous Supabase session
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) return { user: null, error: error.message };

    const userId = data.user!.id;
    const passwordHash = hashPassword(password);

    // Store user credentials locally
    users[username] = { id: userId, passwordHash };
    localStorage.setItem('app_users', JSON.stringify(users));
    localStorage.setItem('current_username', username);

    return { user: { id: userId, username }, error: null };
  } catch (err) {
    return { user: null, error: (err as Error).message };
  }
}

export async function signIn(username: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const users = getStoredUsers();
    const userRecord = users[username];

    if (!userRecord) {
      return { user: null, error: 'User not found' };
    }

    const passwordHash = hashPassword(password);
    if (userRecord.passwordHash !== passwordHash) {
      return { user: null, error: 'Invalid password' };
    }

    // Create anonymous Supabase session with the stored user ID
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) return { user: null, error: error.message };

    // Update the user ID in storage to match the new session
    userRecord.id = data.user!.id;
    users[username] = userRecord;
    localStorage.setItem('app_users', JSON.stringify(users));
    localStorage.setItem('current_username', username);

    return { user: { id: data.user!.id, username }, error: null };
  } catch (err) {
    return { user: null, error: (err as Error).message };
  }
}

export async function signOut(): Promise<void> {
  localStorage.removeItem('current_username');
  await supabase.auth.signOut();
}

export function getCurrentUsername(): string | null {
  return localStorage.getItem('current_username');
}

function getStoredUsers(): Record<string, { id: string; passwordHash: string }> {
  const stored = localStorage.getItem('app_users');
  return stored ? JSON.parse(stored) : {};
}
