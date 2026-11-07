'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    const supabase = createClient();
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return setError(error.message);
      if (!data.session) return setInfo('Check your email to confirm your account, then log in.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return setError(error.message);
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div>
      <h1>{mode === 'login' ? 'Log in' : 'Create account'}</h1>
      <form className="stack" onSubmit={submit}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password (min 6 characters)" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <div className="error">{error}</div>}
        {info && <div className="muted">{info}</div>}
        <button type="submit">{mode === 'login' ? 'Log in' : 'Sign up'}</button>
      </form>
      <p className="muted">
        {mode === 'login' ? 'New here? ' : 'Already have an account? '}
        <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'signup' : 'login'); }} style={{ textDecoration: 'underline' }}>
          {mode === 'login' ? 'Create an account' : 'Log in'}
        </a>
      </p>
    </div>
  );
}
