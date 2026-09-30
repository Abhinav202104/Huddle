import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { user, login, register } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [mode, setMode] = useState('in');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) nav(loc.state?.from?.pathname || '/dashboard', { replace: true });
  }, [user]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (mode === 'up' && !form.name.trim()) return setErr('Enter your name.');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setErr('Enter a valid email address.');
    if (form.password.length < 8) return setErr('Use a password with at least 8 characters.');
    setBusy(true);
    try {
      if (mode === 'up') await register(form.name, form.email, form.password);
      else await login(form.email, form.password);
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Could not reach the server. Is it running?');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="hero">
        <div className="logo">Huddle</div>
        <div>
          <h1>One room for the whole meeting.</h1>
          <p style={{ marginTop: 18 }}>Video, screen sharing, a shared whiteboard and file drops. Nothing to install.</p>
        </div>
        <div className="mini"><i /><i /><i /></div>
      </div>
      <div className="form">
        <div className="card">
          <div className="tabs">
            <button className={mode === 'in' ? 'on' : ''} onClick={() => { setMode('in'); setErr(''); }}>Sign in</button>
            <button className={mode === 'up' ? 'on' : ''} onClick={() => { setMode('up'); setErr(''); }}>Create account</button>
          </div>
          <form onSubmit={submit} noValidate>
            {mode === 'up' && (
              <label>Full name<input className="f" value={form.name} onChange={set('name')} autoComplete="name" /></label>
            )}
            <label>Email<input className="f" type="email" value={form.email} onChange={set('email')} autoComplete="email" placeholder="you@college.edu" /></label>
            <label>Password<input className="f" type="password" value={form.password} onChange={set('password')} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} /></label>
            <button className="btn" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Please wait…' : mode === 'up' ? 'Create account' : 'Sign in'}
            </button>
          </form>
          {err && <p className="err" role="alert">{err}</p>}
          <p className="hint">Passwords are hashed. Sessions use secure HttpOnly cookies.</p>
        </div>
      </div>
    </div>
  );
}
