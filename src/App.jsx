import React, { useState, useEffect } from 'react';

const MATERIALES_CONFIG = {
  'Arena': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  'Grava': { bg: 'bg-slate-200', text: 'text-slate-800', border: 'border-slate-300' },
  'Rajuela': { bg: 'bg-stone-300', text: 'text-stone-900', border: 'border-stone-400' },
  'Ladrillo': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  'Escombro': { bg: 'bg-zinc-100', text: 'text-zinc-700', border: 'border-zinc-300' },
};

const UNIDADES_DISPONIBLES = ['Unidades', 'm³', 'm²', 'Viajes'];
const COLOR_DEFECTO = { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' };

export default function App() {
  const [clientes, setClientes] = useState([]);
  const [nombre, setNombre] = useState('');
  const [empresa, setEmpresa] = useState('');
  
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [tipoMaterial, setTipoMaterial] = useState('');
  const [unidadMedida, setUnidadMedida] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [precio, setPrecio] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({ titulo: '', mensaje: '', accion: null });

  const API_URL = 'http://localhost:4000/api';

  const cargarClientes = async () => {
    try {
      const res = await fetch(`${API_URL}/clientes`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setClientes(data);
      }
    } catch (err) {
      console.error("Error cargando clientes:", err);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const manejarCrearCliente = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    try {
      const res = await fetch(`${API_URL}/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, empresa })
      });
      if (res.ok) {
        setNombre('');
        setEmpresa('');
        await cargarClientes();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const manejarAgregarFlete = async (e) => {
    e.preventDefault();
    if (!clienteSeleccionado || !tipoMaterial || !unidadMedida || !cantidad || !precio) return;

    try {
      const materialConUnidad = `${tipoMaterial} (${unidadMedida})`;
      const res = await fetch(`${API_URL}/clientes/${clienteSeleccionado}/fletes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipoMaterial: materialConUnidad, cantidad, precio, fecha })
      });
      if (res.ok) {
        setTipoMaterial('');
        setUnidadMedida('');
        setCantidad('');
        setPrecio('');
        setFecha(new Date().toISOString().split('T')[0]);
        await cargarClientes();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const confirmarEliminarCliente = (id, nombreCliente) => {
    setModalConfig({
      titulo: '¿Eliminar Cliente?',
      mensaje: `¿Estás completamente seguro de eliminar a "${nombreCliente}"? Esta acción borrará también todo su historial de fletes de forma permanente.`,
      accion: async () => {
        try {
          const res = await fetch(`${API_URL}/clientes/${id}`, { method: 'DELETE' });
          if (res.ok) {
            await cargarClientes();
          }
        } catch (err) {
          console.error(err);
        }
        setModalOpen(false);
      }
    });
    setModalOpen(true);
  };

  const confirmarEliminarFlete = (clienteId, fleteId) => {
    setModalConfig({
      titulo: '¿Eliminar Flete?',
      mensaje: '¿Estás seguro de que deseas remover este registro de carga del cliente? El precio total se recalculará automáticamente.',
      accion: async () => {
        try {
          const res = await fetch(`${API_URL}/clientes/${clienteId}/fletes/${fleteId}`, { method: 'DELETE' });
          if (res.ok) {
            await cargarClientes();
          }
        } catch (err) {
          console.error(err);
        }
        setModalOpen(false);
      }
    });
    setModalOpen(true);
  };

  const exportarAPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans relative">
      
      <style>{`
        @media print {
          header, .no-print, button, form { display: none !important; }
          main { grid-template-cols: 1fr !important; max-w: 100% !important; padding: 0 !important; }
          .lg\\:col-span-2 { grid-column: span 3 / span 3 !important; }
          .shadow-sm, .rounded-2xl { border: none !important; shadow: none !important; }
        }
      `}</style>

      {/* Navbar */}
      <header className="bg-slate-900 text-white shadow-md px-8 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-wide">FreightBD Dashboard</h1>
        <div className="flex items-center gap-4">
          <button 
            onClick={exportarAPDF}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-2"
          >
            🖨️ Exportar Reporte (PDF)
          </button>
          <span className="bg-emerald-500 text-xs px-2 py-1 rounded-full font-medium">Server Online</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: FORMULARIOS */}
        <div className="space-y-6 lg:col-span-1 no-print">
          
          {/* Formulario Clientes */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold mb-4 text-slate-700">Agregar Nuevo Cliente</h2>
            <form onSubmit={manejarCrearCliente} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nombre Completo</label>
                <input 
                  type="text" placeholder="Ej. Juan Pérez" value={nombre} onChange={e => setNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Empresa / Razón Social</label>
                <input 
                  type="text" placeholder="Ej. Logística Norte S.A." value={empresa} onChange={e => setEmpresa(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition">
                Guardar Cliente
              </button>
            </form>
          </div>

          {/* Formulario Fletes */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold mb-4 text-slate-700">Asignar Flete de Carga</h2>
            <form onSubmit={manejarAgregarFlete} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Seleccionar Cliente</label>
                <select 
                  value={clienteSeleccionado} onChange={e => setClienteSeleccionado(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Elige un cliente --</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} ({c.empresa})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tipo de Material</label>
                <select 
                  value={tipoMaterial} onChange={e => setTipoMaterial(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Selecciona un material --</option>
                  {Object.keys(MATERIALES_CONFIG).map(mat => (
                    <option key={mat} value={mat}>{mat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Unidad de Medida</label>
                <select 
                  value={unidadMedida} onChange={e => setUnidadMedida(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Selecciona la unidad --</option>
                  {UNIDADES_DISPONIBLES.map(uni => (
                    <option key={uni} value={uni}>{uni}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Fecha del Trabajo</label>
                <input 
                  type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cantidad</label>
                  <input 
                    type="number" placeholder="Ej. 10" value={cantidad} onChange={e => setCantidad(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Precio ($)</label>
                  <input 
                    type="number" placeholder="Ej. 450" value={precio} onChange={e => setPrecio(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <button className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm transition">
                Añadir Flete
              </button>
            </form>
          </div>

        </div>

        {/* COLUMNA DERECHA: DASHBOARD DE CLIENTES */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-slate-700 mb-2 no-print">Cartera de Clientes y Fletes</h2>
          
          {clientes.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-200 text-slate-400">
              No hay clientes registrados en la base de datos.
            </div>
          ) : (
            clientes.map(cliente => (
              <div key={cliente.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                
                {/* Cabecera del cliente */}
                <div className="bg-slate-100 px-6 py-4 flex justify-between items-center border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-slate-800 text-base">{cliente.nombre}</h3>
                      <button 
                        onClick={() => confirmarEliminarCliente(cliente.id, cliente.nombre)}
                        className="no-print text-xs text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-md transition font-medium"
                      >
                        🗑️ Borrar
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">{cliente.empresa}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Precio Total Final</span>
                    <span className="text-xl font-black text-indigo-600">${(cliente.totalFinal || 0).toLocaleString()}</span>
                  </div>
                </div>

                {/* Listado de Fletes */}
                <div className="p-6">
                  {cliente.fletes && cliente.fletes.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase">
                            <th className="pb-2">Fecha</th>
                            <th className="pb-2">Material / Unidad</th>
                            <th className="pb-2 text-center">Cantidad</th>
                            <th className="pb-2 text-right">Precio Unitario</th>
                            <th className="pb-2 text-right no-print">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-sm text-slate-600">
                          {cliente.fletes.map(flete => {
                            const nombreLimpio = flete.tipoMaterial ? flete.tipoMaterial.split(' ')[0] : '';
                            const estilo = MATERIALES_CONFIG[nombreLimpio] || COLOR_DEFECTO;

                            return (
                              <tr key={flete.id} className="hover:bg-slate-50/50">
                                <td className="py-2.5 text-xs text-slate-500 font-medium">
                                  {flete.fecha ? flete.fecha.split('-').reverse().join('/') : 'S/F'}
                                </td>
                                <td className="py-2.5">
                                  <span className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full border ${estilo.bg} ${estilo.text} ${estilo.border}`}>
                                    {flete.tipoMaterial}
                                  </span>
                                </td>
                                
                                <td className="py-2.5 text-center font-semibold text-slate-800">
                                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                    {flete.cantidad}
                                  </span>
                                </td>

                                <td className="py-2.5 text-right font-semibold text-slate-900">
                                  ${(flete.precio || 0).toLocaleString()}
                                </td>
                                <td className="py-2.5 text-right no-print">
                                  <button 
                                    onClick={() => confirmarEliminarFlete(cliente.id, flete.id)}
                                    className="text-red-400 hover:text-red-600 font-medium text-xs transition px-2 py-1 rounded hover:bg-red-50"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic text-center py-2">Este cliente no registra fletes de momento.</p>
                  )}
                </div>

              </div>
            ))
          )}
        </div>

      </main>

      {/* MODAL DE CONFIRMACIÓN CENTRADO */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <span className="text-2xl">⚠️</span>
              <h4 className="text-lg font-bold text-slate-800">{modalConfig.titulo}</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              {modalConfig.mensaje}
            </p>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition"
              >
                Cancelar
              </button>
              <button 
                onClick={modalConfig.accion}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition shadow-sm"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}