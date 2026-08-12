import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';

export default function Login({ onLogin }) {
  const [modo, setModo] = useState('usuario');
  const [password, setPassword] = useState('');
  const [bypassToken, setBypassToken] = useState('');
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [cargando, setCargando] = useState(false);
  const [cargandoAdmin, setCargandoAdmin] = useState(false);
  const [error, setError] = useState('');
  const [tiempoBloqueado, setTiempoBloqueado] = useState(0);

  useEffect(() => {
    if (tiempoBloqueado <= 0) return undefined;

    const intervalId = setInterval(() => {
      setTiempoBloqueado((actual) => Math.max(0, actual - 1));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [tiempoBloqueado]);

  const bloqueoExplicacion = useMemo(
    () => 'Tras 5 intentos fallidos, el sistema bloquea el acceso por 1 hora. Si el bloqueo ya ocurrió, usa un token de administrador o espera la hora.',
    []
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!password && !bypassToken.trim()) {
      setError('Escribe la contraseña o usa un token de desbloqueo.');
      return;
    }

    setCargando(true);
    setError('');
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password, bypassToken: bypassToken.trim() || undefined })
      });
      onLogin(data.token, data.expiresIn);
    } catch (err) {
      const mensaje = err.message || 'No se pudo iniciar sesión.';
      const texto = mensaje.toLowerCase();

      if (texto.includes('demasiados intentos') || texto.includes('espera 1 hora') || texto.includes('bloque')) {
        const restante = Number.isFinite(err.remainingSeconds) ? Number(err.remainingSeconds) : 0;
        setTiempoBloqueado(restante);
        setError('Demasiados intentos. Espera 1 hora o usa un token de administrador para continuar.');
      } else if (texto.includes('conectar') || texto.includes('conexión') || texto.includes('servidor')) {
        setTiempoBloqueado(0);
        setError('No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.');
      } else if (texto.includes('contraseña') || texto.includes('credencial') || texto.includes('autentic')) {
        setTiempoBloqueado(0);
        setError('La contraseña es incorrecta o no existe.');
      } else if (texto.includes('usuario') || texto.includes('no existe') || texto.includes('encontrado')) {
        setTiempoBloqueado(0);
        setError('El usuario no existe. Verifica tus datos.');
      } else {
        setTiempoBloqueado(0);
        setError(mensaje);
      }
    } finally {
      setCargando(false);
    }
  };

  const iniciarSesionAdmin = async (e) => {
    e.preventDefault();
    if (!adminUsername || !adminPassword) {
      setAdminMessage('Escribe usuario y contraseña de administrador.');
      return;
    }

    setCargandoAdmin(true);
    setAdminMessage('');
    try {
      const data = await apiFetch('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username: adminUsername, password: adminPassword })
      });
      setAdminToken(data.token);
      setAdminMessage('Acceso de administrador correcto.');
    } catch (err) {
      setAdminMessage(err.message || 'No se pudo iniciar sesión como administrador.');
    } finally {
      setCargandoAdmin(false);
    }
  };

  const generarToken = async () => {
    if (!adminToken) {
      setAdminMessage('Primero inicia sesión como administrador.');
      return;
    }

    setCargandoAdmin(true);
    try {
      const data = await apiFetch('/admin/bypass-token', {
        method: 'POST',
        token: adminToken
      });
      setBypassToken(data.token);
      setAdminMessage('Token de desbloqueo generado correctamente.');
    } catch (err) {
      setAdminMessage(err.message || 'No se pudo generar el token.');
    } finally {
      setCargandoAdmin(false);
    }
  };

  const cambiarPassword = async (e) => {
    e.preventDefault();
    if (!adminToken) {
      setAdminMessage('Debes iniciar sesión como administrador primero.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setAdminMessage('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setCargandoAdmin(true);
    try {
      await apiFetch('/admin/password', {
        method: 'POST',
        token: adminToken,
        body: JSON.stringify({ newPassword })
      });
      setNewPassword('');
      setAdminMessage('La contraseña del dashboard fue actualizada correctamente.');
    } catch (err) {
      setAdminMessage(err.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setCargandoAdmin(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
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

        <div className="mb-4 flex rounded-lg border border-line bg-paper-card p-1">
          <button
            type="button"
            onClick={() => setModo('usuario')}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
              modo === 'usuario' ? 'bg-ink text-paper' : 'text-ink-muted hover:bg-white/60'
            }`}
          >
            Usuario
          </button>
          <button
            type="button"
            onClick={() => setModo('admin')}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
              modo === 'admin' ? 'bg-ink text-paper' : 'text-ink-muted hover:bg-white/60'
            }`}
          >
            Admin
          </button>
        </div>

        {modo === 'usuario' ? (
          <form onSubmit={submit} className="bg-paper-card border border-line rounded-2xl shadow-ticket p-6">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted mb-2">Seguridad</p>
            <p className="text-xs text-ink-muted mb-3">{bloqueoExplicacion}</p>

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

            <div className="mt-4">
              <label htmlFor="bypass-token" className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1">
                Token de desbloqueo (si aplica)
              </label>
              <input
                id="bypass-token"
                type="text"
                value={bypassToken}
                onChange={(e) => setBypassToken(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber"
                placeholder="Pega el token del admin"
              />
            </div>

            {error && (
              <>
                <p id="login-error" role="alert" className="text-rust text-xs mt-2 font-medium">
                  {error}
                </p>
                {tiempoBloqueado > 0 && (
                  <p className="text-rust text-xs mt-1 font-semibold tracking-wide">
                    Espera: {String(Math.floor(tiempoBloqueado / 60)).padStart(2, '0')}:{String(tiempoBloqueado % 60).padStart(2, '0')}
                  </p>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full mt-4 py-2.5 bg-ink hover:bg-ink-soft disabled:opacity-60 disabled:cursor-not-allowed text-paper font-display font-semibold uppercase tracking-wide text-sm rounded-lg transition"
            >
              {cargando ? 'Verificando…' : 'Entrar'}
            </button>
          </form>
        ) : (
          <div className="bg-paper-card border border-line rounded-2xl shadow-ticket p-6 space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted mb-2">Administrador</p>
              <form onSubmit={iniciarSesionAdmin} className="space-y-3">
                <div>
                  <label htmlFor="admin-user" className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1">
                    Usuario
                  </label>
                  <input
                    id="admin-user"
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber"
                  />
                </div>
                <div>
                  <label htmlFor="admin-pass" className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1">
                    Contraseña
                  </label>
                  <input
                    id="admin-pass"
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber"
                  />
                </div>
                <button
                  type="submit"
                  disabled={cargandoAdmin}
                  className="w-full py-2.5 bg-ink hover:bg-ink-soft disabled:opacity-60 text-paper font-display font-semibold uppercase tracking-wide text-sm rounded-lg transition"
                >
                  {cargandoAdmin ? 'Ingresando…' : 'Entrar como admin'}
                </button>
              </form>
            </div>

            {adminToken && (
              <div className="space-y-3 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={generarToken}
                  disabled={cargandoAdmin}
                  className="w-full py-2.5 bg-amber hover:bg-amber-dark text-ink font-display font-semibold uppercase tracking-wide text-sm rounded-lg transition"
                >
                  {cargandoAdmin ? 'Generando…' : 'Generar token de desbloqueo'}
                </button>

                {bypassToken && (
                  <div className="rounded-xl border border-dashed border-amber bg-amber/10 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted mb-1">Token</div>
                    <p className="break-all text-xs text-ink font-mono">{bypassToken}</p>
                  </div>
                )}

                <form onSubmit={cambiarPassword} className="space-y-3">
                  <div>
                    <label htmlFor="new-pass" className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1">
                      Nueva contraseña del dashboard
                    </label>
                    <input
                      id="new-pass"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber"
                      placeholder="Mínimo 8 caracteres"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={cargandoAdmin}
                    className="w-full py-2.5 bg-pine hover:bg-pine-dark text-paper font-display font-semibold uppercase tracking-wide text-sm rounded-lg transition"
                  >
                    {cargandoAdmin ? 'Guardando…' : 'Registrar nueva pass'}
                  </button>
                </form>
              </div>
            )}

            {adminMessage && (
              <p className="text-xs text-ink-muted border-t border-line pt-3">{adminMessage}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
