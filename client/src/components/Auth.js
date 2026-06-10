import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthState';

// Login / Register screen shown when the user is not authenticated.
export const Auth = () => {
  const { login, register, error, clearError } = useContext(AuthContext);
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const switchMode = (m) => {
    setMode(m);
    clearError();
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (mode === 'login') login({ email: form.email, password: form.password });
    else register(form);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-brand">
          <span className="brand-mark large">₹</span>
          <h2>Expense Tracker</h2>
          <p className="auth-tagline">Accounts, atomic transfers & spending insights</p>
        </div>
        <div className="auth-card">
          <div className="auth-tabs">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Login</button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>Register</button>
          </div>

          {error && <p className="note-err">{Array.isArray(error) ? error.join(', ') : error}</p>}

          <form onSubmit={onSubmit}>
            {mode === 'register' && (
              <div className="form-control">
                <label>Name</label>
                <input type="text" name="name" value={form.name} onChange={onChange} placeholder="Your name" required />
              </div>
            )}
            <div className="form-control">
              <label>Email</label>
              <input type="email" name="email" value={form.email} onChange={onChange} placeholder="you@example.com" required />
            </div>
            <div className="form-control">
              <label>Password</label>
              <input type="password" name="password" value={form.password} onChange={onChange} placeholder="••••••••" minLength={6} required />
            </div>
            <button className="btn">{mode === 'login' ? 'Login' : 'Create account'}</button>
          </form>

          <p className="auth-hint">Demo: <code>demo@example.com</code> / <code>demo1234</code></p>
        </div>
      </div>
    </div>
  );
};
