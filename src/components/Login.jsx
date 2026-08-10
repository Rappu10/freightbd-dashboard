import React, { useState } from 'react';
import { apiFetch } from '../lib/api';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Escribe la contraseña.');
      return;
    }
    setCargando(true);
    setError('');
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password })
      });
      onLogin(data.token, data.expiresIn);
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber" aria-hidden="true" />
            <span className="font-mono text-xs tracking-widest text-ink-muted uppercase">
              Acceso restringido
            </span>
          </div>
          <h1 className="font-display font-semibold text-3xl uppercase tracking-wide text-ink">
            FreightBD
          </h1>
          <p className="text-sm text-ink-muted mt-1">Panel de clientes y fletes</p>
        </div>

        <form
          onSubmit={submit}
          className="bg-paper-card border border-line rounded-2xl shadow-ticket p-6"
        >
          <label htmlFor="password" className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? 'login-error' : undefined}
            className="w-full px-3 py-2.5 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber"
            placeholder="••••••••"
          />
          {error && (
            <p id="login-error" role="alert" className="text-rust text-xs mt-2 font-medium">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={cargando}
            className="w-full mt-4 py-2.5 bg-ink hover:bg-ink-soft disabled:opacity-60 disabled:cursor-not-allowed text-paper font-display font-semibold uppercase tracking-wide text-sm rounded-lg transition"
          >
            {cargando ? 'Verificando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
