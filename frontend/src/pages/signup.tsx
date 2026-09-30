import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { apiFetch } from '../lib/api';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const data = await apiFetch('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
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
        <h1>Sign up</h1>
        {error && <p className="error">{error}</p>}
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        <input placeholder="Password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        <button type="submit">Sign up</button>
        <p>Already have an account? <Link href="/login">Log in</Link></p>
      </form>
    </div>
  );
}
