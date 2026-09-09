import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch, SesionExpiradaError } from './lib/api';
import Login from './components/Login';
import ConfirmModal from './components/ConfirmModal';
import ClientTicket from './components/ClientTicket';
import ToastStack from './components/Toast';
import { formatMoney } from './lib/format';

const MATERIALES_DISPONIBLES = ['Arena', 'Grava', 'Rajuela', 'Ladrillo', 'Escombro'];
const UNIDADES_DISPONIBLES = ['Unidades', 'm³', 'm²', 'Viajes'];

const TOKEN_KEY = 'freightbd_token';
const TOKEN_EXP_KEY = 'freightbd_token_exp';

function leerSesionGuardada() {
  const token = localStorage.getItem(TOKEN_KEY);
  const exp = Number(localStorage.getItem(TOKEN_EXP_KEY));
  if (!token || !exp || Date.now() >= exp) return null;
  return token;
}

export default function App() {
  const [token, setToken] = useState(() => leerSesionGuardada());
  const [clientes, setClientes] = useState([]);
  const [cargandoClientes, setCargandoClientes] = useState(true);
  const [clima, setClima] = useState(null);
  const [mostrarBienvenida, setMostrarBienvenida] = useState(false);
  const usuarioActual = 'Usuario';

  const [toasts, setToasts] = useState([]);
  const notificar = useCallback((mensaje, tipo = 'exito') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, mensaje, tipo }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);
  const descartarToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const cerrarSesion = useCallback((mensaje) => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXP_KEY);
    setToken(null);
    setClientes([]);
    if (mensaje) notificar(mensaje, 'error');
  }, [notificar]);

  const manejarError = useCallback((err) => {
    if (err instanceof SesionExpiradaError) {
      cerrarSesion(err.message);
    } else {
      notificar(err.message || 'Ocurrió un error inesperado.', 'error');
    }
  }, [cerrarSesion, notificar]);

  const iniciarSesion = (nuevoToken, expiresInSeg) => {
    const expira = Date.now() + expiresInSeg * 1000;
    localStorage.setItem(TOKEN_KEY, nuevoToken);
    localStorage.setItem(TOKEN_EXP_KEY, String(expira));
    setToken(nuevoToken);
    setMostrarBienvenida(true);
  };

  useEffect(() => {
    if (!token) {
      setMostrarBienvenida(false);
      return undefined;
    }

    const timeoutId = setTimeout(() => setMostrarBienvenida(false), 5000);
    return () => clearTimeout(timeoutId);
  }, [token]);

  // ---- Carga de clientes ----
  const cargarClientes = useCallback(async () => {
    if (!token) return;
    setCargandoClientes(true);
    try {
      const data = await apiFetch('/clientes', { token });
      if (Array.isArray(data)) setClientes(data);
    } catch (err) {
      manejarError(err);
    } finally {
      setCargandoClientes(false);
    }
  }, [token, manejarError]);

  useEffect(() => {
    if (token) cargarClientes();
  }, [token, cargarClientes]);

  useEffect(() => {
    if (!token) return undefined;
    let activo = true;
    apiFetch('/weather', { token })
      .then((data) => {
        if (activo) setClima(data);
      })
      .catch(() => {
        if (activo) setClima(null);
      });
    return () => {
      activo = false;
    };
  }, [token]);

  // ---- Formulario: nuevo cliente ----
  const [nombre, setNombre] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [erroresCliente, setErroresCliente] = useState({});
  const [creandoCliente, setCreandoCliente] = useState(false);

  const validarCliente = () => {
    const errores = {};
    const nombreLimpio = nombre.trim().replace(/\s+/g, ' ');

    if (!nombreLimpio) {
      errores.nombre = 'El nombre completo es obligatorio.';
    } else if (nombreLimpio.length < 2) {
      errores.nombre = 'Escribe al menos 2 caracteres.';
    } else if (nombreLimpio.length > 100) {
      errores.nombre = 'Máximo 100 caracteres.';
    } else if (/\s{2,}/.test(nombreLimpio)) {
      errores.nombre = 'Evita dejar espacios dobles entre palabras.';
    } else if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s.'-]+$/.test(nombreLimpio)) {
      errores.nombre = 'Solo se permiten letras, espacios, acentos, puntos, apóstrofes y guiones.';
    } else if (/^[\s.'-]+$/.test(nombreLimpio) || /[\s.'-]+$/.test(nombreLimpio)) {
      errores.nombre = 'El nombre no puede iniciar ni terminar con espacios, puntos, guiones o apóstrofes.';
    } else {
      const palabras = nombreLimpio.split(/\s+/).filter(Boolean);
      if (palabras.length < 2) {
        errores.nombre = 'Escribe nombre y apellido completos.';
      }
      if (palabras.some((palabra) => palabra.length < 2)) {
        errores.nombre = 'Cada palabra debe tener al menos 2 caracteres.';
      }
    }

    if (empresa.trim().length > 150) errores.empresa = 'Máximo 150 caracteres.';
    setErroresCliente(errores);
    return Object.keys(errores).length === 0;
  };

  const manejarCrearCliente = async (e) => {
    e.preventDefault();
    if (!validarCliente()) return;

    setCreandoCliente(true);
    try {
      await apiFetch('/clientes', {
        method: 'POST',
        token,
        body: JSON.stringify({ nombre: nombre.trim(), empresa: empresa.trim() })
      });
      setNombre('');
      setEmpresa('');
      setErroresCliente({});
      notificar('Cliente agregado.');
      await cargarClientes();
    } catch (err) {
      manejarError(err);
    } finally {
      setCreandoCliente(false);
    }
  };

  // ---- Formulario: nuevo flete ----
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [tipoMaterial, setTipoMaterial] = useState('');
  const [unidadMedida, setUnidadMedida] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [precio, setPrecio] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [erroresFlete, setErroresFlete] = useState({});
  const [creandoFlete, setCreandoFlete] = useState(false);

  const validarFlete = () => {
    const errores = {};
    const hoy = new Date();
    const inicioAnioActual = new Date(hoy.getFullYear(), 0, 1);
    const fechaSeleccionada = fecha ? new Date(`${fecha}T00:00:00`) : null;

    if (!clienteSeleccionado) errores.clienteSeleccionado = 'Elige un cliente.';
    if (!MATERIALES_DISPONIBLES.includes(tipoMaterial)) errores.tipoMaterial = 'Elige un material.';
    if (!UNIDADES_DISPONIBLES.includes(unidadMedida)) errores.unidadMedida = 'Elige una unidad.';
    const cantidadNum = Number(cantidad);
    if (!cantidad || Number.isNaN(cantidadNum) || cantidadNum <= 0) errores.cantidad = 'Cantidad inválida.';
    else if (cantidadNum >= 1000000) errores.cantidad = 'Cantidad demasiado grande.';
    const precioNum = Number(precio);
    if (!precio || Number.isNaN(precioNum) || precioNum <= 0) errores.precio = 'Precio inválido.';
    else if (precioNum >= 10000000) errores.precio = 'Precio demasiado grande.';
    if (!fecha) {
      errores.fecha = 'Elige una fecha.';
    } else if (fechaSeleccionada > hoy) {
      errores.fecha = 'La fecha del trabajo no puede estar en el futuro.';
    } else if (fechaSeleccionada < inicioAnioActual) {
      errores.fecha = 'La fecha del trabajo no puede ser anterior al año en curso.';
    }
    setErroresFlete(errores);
    return Object.keys(errores).length === 0;
  };

  const manejarAgregarFlete = async (e) => {
    e.preventDefault();
    if (!validarFlete()) return;

    setCreandoFlete(true);
    try {
      await apiFetch(`/clientes/${clienteSeleccionado}/fletes`, {
        method: 'POST',
        token,
        body: JSON.stringify({ tipoMaterial, unidadMedida, cantidad, precio, fecha })
      });
      setTipoMaterial('');
      setUnidadMedida('');
      setCantidad('');
      setPrecio('');
      setFecha(new Date().toISOString().split('T')[0]);
      setErroresFlete({});
      notificar('Flete agregado.');
      await cargarClientes();
    } catch (err) {
      manejarError(err);
    } finally {
      setCreandoFlete(false);
    }
  };

  // ---- Eliminaciones ----
  const [modal, setModal] = useState({ open: false, titulo: '', mensaje: '', accion: null });
  const [eliminandoModal, setEliminandoModal] = useState(false);
  const [eliminandoFleteId, setEliminandoFleteId] = useState(null);

  const confirmarEliminarCliente = (id, nombreCliente) => {
    setModal({
      open: true,
      titulo: '¿Eliminar cliente?',
      mensaje: `¿Estás seguro de eliminar a "${nombreCliente}"? Esta acción borrará también todo su historial de fletes de forma permanente.`,
      accion: async () => {
        setEliminandoModal(true);
        try {
          await apiFetch(`/clientes/${id}`, { method: 'DELETE', token });
          notificar('Cliente eliminado.');
          await cargarClientes();
          setModal((m) => ({ ...m, open: false }));
        } catch (err) {
          manejarError(err);
        } finally {
          setEliminandoModal(false);
        }
      }
    });
  };

  const confirmarEliminarFlete = (clienteId, fleteId) => {
    setModal({
      open: true,
      titulo: '¿Eliminar flete?',
      mensaje: 'Este registro de carga se eliminará y el total del cliente se recalculará automáticamente.',
      accion: async () => {
        setEliminandoModal(true);
        setEliminandoFleteId(fleteId);
        try {
          await apiFetch(`/clientes/${clienteId}/fletes/${fleteId}`, { method: 'DELETE', token });
          notificar('Flete eliminado.');
          await cargarClientes();
          setModal((m) => ({ ...m, open: false }));
        } catch (err) {
          manejarError(err);
        } finally {
          setEliminandoModal(false);
          setEliminandoFleteId(null);
        }
      }
    });
  };

  const exportarAPDF = (clienteId = null) => {
    const cards = document.querySelectorAll('.ticket-card');
    cards.forEach((card) => {
      card.classList.remove('pdf-single-target', 'pdf-hidden-export');
      if (clienteId) {
        if (card.id === `cliente-${clienteId}`) {
          card.classList.add('pdf-single-target');
        } else {
          card.classList.add('pdf-hidden-export');
        }
      }
    });

    document.body.classList.toggle('pdf-single-export', Boolean(clienteId));
    document.body.classList.toggle('pdf-all-export', !clienteId);

    const limpiar = () => {
      document.body.classList.remove('pdf-single-export', 'pdf-all-export');
      cards.forEach((card) => card.classList.remove('pdf-single-target', 'pdf-hidden-export'));
      window.removeEventListener('afterprint', limpiar);
    };

    window.addEventListener('afterprint', limpiar, { once: true });
    window.print();
  };

  // ---- Búsqueda y orden ----
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('recientes');

  const clientesVisibles = useMemo(() => {
    const filtro = busqueda.trim().toLowerCase();
    let lista = clientes.filter((c) =>
      !filtro ||
      c.nombre?.toLowerCase().includes(filtro) ||
      c.empresa?.toLowerCase().includes(filtro)
    );

    if (orden === 'total-desc') {
      lista = [...lista]
        .filter((c) => (Number(c.totalFinal) || 0) > 0)
        .sort((a, b) => (Number(b.totalFinal) || 0) - (Number(a.totalFinal) || 0))
        .slice(0, 3);
    } else if (orden === 'nombre-asc') {
      lista = [...lista].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    } else {
      lista = [...lista]
        .sort((a, b) => (b.creadoEn || '').localeCompare(a.creadoEn || ''))
        .slice(0, 5);
    }
    return lista;
  }, [clientes, busqueda, orden]);

  const resumen = useMemo(() => {
    const totalFacturado = clientes.reduce((sum, c) => sum + (c.totalFinal || 0), 0);
    const totalFletes = clientes.reduce((sum, c) => sum + (c.fletes?.length || 0), 0);
    return { totalClientes: clientes.length, totalFletes, totalFacturado };
  }, [clientes]);

  const triggerSummary = useMemo(() => {
    const clientesSinFletes = clientes.filter((c) => !(c.fletes?.length)).length;
    const clientesSinEmpresa = clientes.filter((c) => !String(c.empresa || '').trim()).length;
    const clientesConMontoAlto = clientes.filter((c) => (c.totalFinal || 0) > 100000).length;

    return {
      clientesSinFletes,
      clientesSinEmpresa,
      clientesConMontoAlto
    };
  }, [clientes]);

  const alertas = useMemo(() => {
    const lista = [];

    if (clientes.length === 0) {
      lista.push({ nivel: 'info', mensaje: 'Aún no hay clientes registrados.' });
      return lista;
    }

    if (triggerSummary.clientesSinFletes > 0) {
      const clientesAFijar = clientes.filter((c) => !(c.fletes?.length));
      lista.push({
        nivel: 'warning',
        mensaje: `${triggerSummary.clientesSinFletes} cliente${triggerSummary.clientesSinFletes > 1 ? 's' : ''} sin fletes asignados.`,
        clientes: clientesAFijar.map((c) => ({ id: c.id, nombre: c.nombre }))
      });
    }

    if (triggerSummary.clientesSinEmpresa > 0) {
      const clientesSinEmpresaLista = clientes.filter((c) => !String(c.empresa || '').trim());
      lista.push({
        nivel: 'warning',
        mensaje: `${triggerSummary.clientesSinEmpresa} cliente${triggerSummary.clientesSinEmpresa > 1 ? 's' : ''} sin empresa registrada.`,
        clientes: clientesSinEmpresaLista.map((c) => ({ id: c.id, nombre: c.nombre }))
      });
    }

    if (triggerSummary.clientesConMontoAlto > 0) {
      const clientesMontoAlto = clientes.filter((c) => (c.totalFinal || 0) > 100000);
      lista.push({
        nivel: 'danger',
        mensaje: `${triggerSummary.clientesConMontoAlto} cliente${triggerSummary.clientesConMontoAlto > 1 ? 's' : ''} con facturación superior a $100,000.`,
        clientes: clientesMontoAlto.map((c) => ({ id: c.id, nombre: c.nombre }))
      });
    }

    if (lista.length === 0) {
      lista.push({ nivel: 'success', mensaje: 'Todo en orden: sin alertas activas.' });
    }

    return lista;
  }, [clientes, triggerSummary]);

  const irAlCliente = (clienteId) => {
    const elemento = document.getElementById(`cliente-${clienteId}`);
    if (!elemento) return;
    elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
    elemento.focus({ preventScroll: true });
  };

  if (!token) {
    return <Login onLogin={iniciarSesion} />;
  }

  return (
    <div className="min-h-screen text-ink font-body relative pb-10">
      {/* Navbar */}
      <header className="bg-ink text-paper px-6 md:px-8 py-4 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-amber" aria-hidden="true" />
          <h1 className="font-display font-semibold text-lg md:text-xl uppercase tracking-wide">
            FreightBD · Panel de Fletes
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportarAPDF}
            className="bg-amber hover:bg-amber-dark text-ink text-xs md:text-sm font-display font-semibold uppercase px-3 md:px-4 py-2 rounded-lg transition"
          >
            Exportar reporte
          </button>
          <button
            onClick={() => cerrarSesion()}
            className="text-paper/70 hover:text-paper text-xs md:text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/10 transition no-print"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {mostrarBienvenida && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-pine/30 bg-paper-card/95 p-4 shadow-ticket backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-pine">Bienvenido</p>
                <h2 className="font-display text-2xl uppercase tracking-wide text-ink">{usuarioActual}</h2>
              </div>
              <button
                type="button"
                onClick={() => setMostrarBienvenida(false)}
                className="rounded-full border border-line bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted transition hover:text-ink"
              >
                Cerrar
              </button>
            </div>
            <ul className="mt-3 list-disc pl-5 text-sm text-ink-muted space-y-1">
              <li>Revisa los clientes sin fletes.</li>
              <li>Completa los clientes sin empresa.</li>
              <li>Monitorea la facturación por encima de $100,000.</li>
            </ul>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 md:px-8 pt-6 no-print">
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <div className="bg-paper-card border border-line rounded-xl px-4 py-3">
            <span className="text-[10px] md:text-xs font-semibold text-ink-muted uppercase tracking-wide block">Clientes</span>
            <span className="font-display font-bold text-xl md:text-2xl text-ink">{resumen.totalClientes}</span>
          </div>
          <div className="bg-paper-card border border-line rounded-xl px-4 py-3">
            <span className="text-[10px] md:text-xs font-semibold text-ink-muted uppercase tracking-wide block">Fletes</span>
            <span className="font-display font-bold text-xl md:text-2xl text-ink">{resumen.totalFletes}</span>
          </div>
          <div className="bg-paper-card border border-line rounded-xl px-4 py-3">
            <span className="text-[10px] md:text-xs font-semibold text-ink-muted uppercase tracking-wide block">Facturado</span>
            <span className="font-display font-bold text-xl md:text-2xl text-pine">${formatMoney(resumen.totalFacturado)}</span>
          </div>
        </div>
        {clima && (
          <div className="mt-3 border border-line rounded-xl bg-paper-card px-4 py-3 text-sm text-ink-muted">
            <span className="font-semibold text-ink">Clima en {clima.ubicacion}:</span>{' '}
            {clima.temperatura}{clima.unidad} · {clima.condicion}
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-8 pt-6 no-print">
        <div className="bg-paper-card border border-line rounded-2xl p-5 shadow-ticket">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-[10px] md:text-xs font-semibold text-ink-muted uppercase tracking-wide">Situación de triggers</p>
              <h3 className="font-display font-semibold uppercase text-base text-ink">Estado operativo</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-ink/5 px-2.5 py-1 text-[11px] font-medium text-ink">
                <span className="w-2 h-2 rounded-full bg-amber" aria-hidden="true" />
                Sin fletes: {triggerSummary.clientesSinFletes}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-ink/5 px-2.5 py-1 text-[11px] font-medium text-ink">
                <span className="w-2 h-2 rounded-full bg-rust" aria-hidden="true" />
                Sin empresa: {triggerSummary.clientesSinEmpresa}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-ink/5 px-2.5 py-1 text-[11px] font-medium text-ink">
                <span className="w-2 h-2 rounded-full bg-pine" aria-hidden="true" />
                Monto alto: {triggerSummary.clientesConMontoAlto}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {alertas.map((alerta, index) => (
              <div
                key={`${alerta.nivel}-${index}`}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  alerta.nivel === 'danger'
                    ? 'border-rust/40 bg-rust/5 text-rust'
                    : alerta.nivel === 'warning'
                      ? 'border-amber/50 bg-amber/10 text-ink'
                      : alerta.nivel === 'info'
                        ? 'border-sky-200 bg-sky-50 text-sky-800'
                        : 'border-pine/40 bg-pine/5 text-pine'
                }`}
                role="alert"
              >
                <div className="font-semibold uppercase tracking-wide text-[10px] mb-1">Alerta</div>
                <p>{alerta.mensaje}</p>

                {alerta.clientes && alerta.clientes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {alerta.clientes.slice(0, 3).map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={() => irAlCliente(cliente.id)}
                        className="inline-flex items-center rounded-full border border-current/30 bg-white/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide hover:bg-white/70 transition"
                      >
                        Ver {cliente.nombre}
                      </button>
                    ))}
                    {alerta.clientes.length > 3 && (
                      <span className="inline-flex items-center rounded-full border border-current/30 bg-white/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">
                        +{alerta.clientes.length - 3} más
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* COLUMNA IZQUIERDA: FORMULARIOS */}
        <div className="space-y-6 lg:col-span-1 no-print">

          {/* Formulario Clientes */}
          <div className="bg-paper-card p-6 rounded-2xl shadow-ticket border border-line">
            <h2 className="font-display font-semibold uppercase tracking-wide text-sm mb-4 text-ink">
              Agregar nuevo cliente
            </h2>
            <form onSubmit={manejarCrearCliente} className="space-y-3" noValidate>
              <div>
                <label htmlFor="nombre" className="block text-xs font-semibold text-ink-muted uppercase mb-1">
                  Nombre completo
                </label>
                <input
                  id="nombre" type="text" placeholder="Ej. Juan Pérez" value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  aria-invalid={!!erroresCliente.nombre}
                  className="w-full px-3 py-2 bg-white border border-line rounded-lg text-sm focus:ring-2 focus:ring-amber focus:outline-none"
                />
                {erroresCliente.nombre && <p role="alert" className="text-rust text-xs mt-1">{erroresCliente.nombre}</p>}
              </div>
              <div>
                <label htmlFor="empresa" className="block text-xs font-semibold text-ink-muted uppercase mb-1">
                  Empresa / Razón social
                </label>
                <input
                  id="empresa" type="text" placeholder="Ej. Logística Norte S.A." value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  aria-invalid={!!erroresCliente.empresa}
                  className="w-full px-3 py-2 bg-white border border-line rounded-lg text-sm focus:ring-2 focus:ring-amber focus:outline-none"
                />
                {erroresCliente.empresa && <p role="alert" className="text-rust text-xs mt-1">{erroresCliente.empresa}</p>}
              </div>
              <button
                disabled={creandoCliente}
                className="w-full py-2.5 bg-ink hover:bg-ink-soft disabled:opacity-60 text-paper font-display font-semibold uppercase tracking-wide rounded-lg text-sm transition"
              >
                {creandoCliente ? 'Guardando…' : 'Guardar cliente'}
              </button>
            </form>
          </div>

          {/* Formulario Fletes */}
          <div className="bg-paper-card p-6 rounded-2xl shadow-ticket border border-line">
            <h2 className="font-display font-semibold uppercase tracking-wide text-sm mb-4 text-ink">
              Asignar flete de carga
            </h2>
            <form onSubmit={manejarAgregarFlete} className="space-y-3" noValidate>
              <div>
                <label htmlFor="clienteSel" className="block text-xs font-semibold text-ink-muted uppercase mb-1">
                  Cliente
                </label>
                <select
                  id="clienteSel" value={clienteSeleccionado} onChange={(e) => setClienteSeleccionado(e.target.value)}
                  aria-invalid={!!erroresFlete.clienteSeleccionado}
                  className="w-full px-3 py-2 bg-white border border-line rounded-lg text-sm focus:ring-2 focus:ring-amber focus:outline-none"
                >
                  <option value="">-- Elige un cliente --</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre} ({c.empresa})</option>
                  ))}
                </select>
                {erroresFlete.clienteSeleccionado && <p role="alert" className="text-rust text-xs mt-1">{erroresFlete.clienteSeleccionado}</p>}
              </div>

              <div>
                <label htmlFor="material" className="block text-xs font-semibold text-ink-muted uppercase mb-1">
                  Tipo de material
                </label>
                <select
                  id="material" value={tipoMaterial} onChange={(e) => setTipoMaterial(e.target.value)}
                  aria-invalid={!!erroresFlete.tipoMaterial}
                  className="w-full px-3 py-2 bg-white border border-line rounded-lg text-sm focus:ring-2 focus:ring-amber focus:outline-none"
                >
                  <option value="">-- Selecciona un material --</option>
                  {MATERIALES_DISPONIBLES.map((mat) => <option key={mat} value={mat}>{mat}</option>)}
                </select>
                {erroresFlete.tipoMaterial && <p role="alert" className="text-rust text-xs mt-1">{erroresFlete.tipoMaterial}</p>}
              </div>

              <div>
                <label htmlFor="unidad" className="block text-xs font-semibold text-ink-muted uppercase mb-1">
                  Unidad de medida
                </label>
                <select
                  id="unidad" value={unidadMedida} onChange={(e) => setUnidadMedida(e.target.value)}
                  aria-invalid={!!erroresFlete.unidadMedida}
                  className="w-full px-3 py-2 bg-white border border-line rounded-lg text-sm focus:ring-2 focus:ring-amber focus:outline-none"
                >
                  <option value="">-- Selecciona la unidad --</option>
                  {UNIDADES_DISPONIBLES.map((uni) => <option key={uni} value={uni}>{uni}</option>)}
                </select>
                {erroresFlete.unidadMedida && <p role="alert" className="text-rust text-xs mt-1">{erroresFlete.unidadMedida}</p>}
              </div>

              <div>
                <label htmlFor="fecha" className="block text-xs font-semibold text-ink-muted uppercase mb-1">
                  Fecha del trabajo
                </label>
                <input
                  id="fecha"
                  type="date"
                  value={fecha}
                  min={`${new Date().getFullYear()}-01-01`}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFecha(e.target.value)}
                  aria-invalid={!!erroresFlete.fecha}
                  className="w-full px-3 py-2 bg-white border border-line rounded-lg text-sm focus:ring-2 focus:ring-amber focus:outline-none"
                />
                {erroresFlete.fecha && <p role="alert" className="text-rust text-xs mt-1">{erroresFlete.fecha}</p>}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="cantidad" className="block text-xs font-semibold text-ink-muted uppercase mb-1">
                    Cantidad
                  </label>
                  <input
                    id="cantidad" type="number" min="0" step="any" placeholder="Ej. 10" value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    aria-invalid={!!erroresFlete.cantidad}
                    className="w-full px-3 py-2 bg-white border border-line rounded-lg text-sm focus:ring-2 focus:ring-amber focus:outline-none"
                  />
                  {erroresFlete.cantidad && <p role="alert" className="text-rust text-xs mt-1">{erroresFlete.cantidad}</p>}
                </div>
                <div>
                  <label htmlFor="precio" className="block text-xs font-semibold text-ink-muted uppercase mb-1">
                    Precio ($)
                  </label>
                  <input
                    id="precio" type="number" min="0" step="any" placeholder="Ej. 450" value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    aria-invalid={!!erroresFlete.precio}
                    className="w-full px-3 py-2 bg-white border border-line rounded-lg text-sm focus:ring-2 focus:ring-amber focus:outline-none"
                  />
                  {erroresFlete.precio && <p role="alert" className="text-rust text-xs mt-1">{erroresFlete.precio}</p>}
                </div>
              </div>
              <button
                disabled={creandoFlete}
                className="w-full py-2.5 bg-amber hover:bg-amber-dark disabled:opacity-60 text-ink font-display font-semibold uppercase tracking-wide rounded-lg text-sm transition"
              >
                {creandoFlete ? 'Agregando…' : 'Añadir flete'}
              </button>
            </form>
          </div>

        </div>

        {/* COLUMNA DERECHA: DASHBOARD DE CLIENTES */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 no-print">
            <h2 className="font-display font-semibold uppercase tracking-wide text-base text-ink">
              Cartera de clientes
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar cliente o empresa…"
                aria-label="Buscar cliente o empresa"
                className="px-3 py-1.5 bg-paper-card border border-line rounded-lg text-sm focus:ring-2 focus:ring-amber focus:outline-none w-44 md:w-56"
              />
              <select
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
                aria-label="Ordenar clientes"
                className="px-2 py-1.5 bg-paper-card border border-line rounded-lg text-sm focus:ring-2 focus:ring-amber focus:outline-none"
              >
                <option value="recientes">Recientes (top 5)</option>
                <option value="total-desc">Mayor total (top 3)</option>
                <option value="nombre-asc">Todos por A-Z</option>
              </select>
            </div>
          </div>

          {cargandoClientes ? (
            <div className="space-y-4" aria-busy="true" aria-label="Cargando clientes">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-paper-card rounded-2xl border border-line h-32 animate-pulse" />
              ))}
            </div>
          ) : clientesVisibles.length === 0 ? (
            <div className="bg-paper-card rounded-2xl p-8 text-center border border-dashed border-line text-ink-muted">
              {clientes.length === 0
                ? 'No hay clientes registrados todavía. Agrega el primero desde el formulario.'
                : 'Ningún cliente coincide con tu búsqueda.'}
            </div>
          ) : (
            clientesVisibles.map((cliente) => (
              <ClientTicket
                key={cliente.id}
                cliente={cliente}
                onEliminarCliente={confirmarEliminarCliente}
                onEliminarFlete={confirmarEliminarFlete}
                onExportarCliente={exportarAPDF}
                eliminandoId={eliminandoFleteId}
              />
            ))
          )}
        </div>

      </main>

      <ConfirmModal
        open={modal.open}
        titulo={modal.titulo}
        mensaje={modal.mensaje}
        cargando={eliminandoModal}
        onCancel={() => setModal((m) => ({ ...m, open: false }))}
        onConfirm={() => modal.accion && modal.accion()}
      />

      <ToastStack toasts={toasts} onDismiss={descartarToast} />
    </div>
  );
}
