import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { apiFetch } from '../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      router.push('/workspaces');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="auth-form">
        <h1>Log in</h1>
        {error && <p className="error">{error}</p>}
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        <input placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        <button type="submit">Log in</button>
        <p>No account? <Link href="/signup">Sign up</Link></p>
      </form>
    </div>
  );
}
