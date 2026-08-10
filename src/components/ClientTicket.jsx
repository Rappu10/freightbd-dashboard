import React from 'react';
import { formatMoney, formatFecha, ticketNumero } from '../lib/format';

const MATERIALES_CONFIG = {
  Arena: { bg: 'bg-amber-light', text: 'text-amber-dark', border: 'border-amber' },
  Grava: { bg: 'bg-[#E5E0D3]', text: 'text-ink-soft', border: 'border-line' },
  Rajuela: { bg: 'bg-[#DCD3C0]', text: 'text-ink-soft', border: 'border-[#B9AD91]' },
  Ladrillo: { bg: 'bg-rust-light', text: 'text-rust-dark', border: 'border-rust' },
  Escombro: { bg: 'bg-pine-light', text: 'text-pine', border: 'border-pine' }
};
const COLOR_DEFECTO = { bg: 'bg-line/40', text: 'text-ink-soft', border: 'border-line' };

export default function ClientTicket({ cliente, onEliminarCliente, onEliminarFlete, eliminandoId }) {
  return (
    <div className="ticket-card bg-paper-card rounded-2xl shadow-ticket border border-line overflow-hidden">
      {/* Cabecera del cliente */}
      <div className="px-6 py-4 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[11px] text-ink-muted tracking-wider">
              N° {ticketNumero(cliente.id)}
            </span>
          </div>
          <h3 className="font-display font-semibold text-lg text-ink truncate mt-0.5">
            {cliente.nombre}
          </h3>
          <p className="text-xs text-ink-muted">{cliente.empresa}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] font-semibold text-ink-muted block uppercase tracking-wide">
            Total
          </span>
          <span className="stamp inline-block font-display font-bold text-xl text-pine border-2 border-pine rounded px-2 py-0.5 mt-0.5">
            ${formatMoney(cliente.totalFinal)}
          </span>
        </div>
      </div>

      <div className="px-6">
        <button
          onClick={() => onEliminarCliente(cliente.id, cliente.nombre)}
          className="no-print text-xs text-rust hover:text-rust-dark bg-rust-light hover:bg-rust-light/70 px-2.5 py-1 rounded-md transition font-medium"
        >
          Eliminar cliente
        </button>
      </div>

      {/* Listado de fletes */}
      <div className="ticket-perforation mt-4 px-6 pt-5 pb-5">
        {cliente.fletes && cliente.fletes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line text-ink-muted text-[11px] font-semibold uppercase tracking-wide">
                  <th className="pb-2 font-medium">Fecha</th>
                  <th className="pb-2 font-medium">Material</th>
                  <th className="pb-2 text-center font-medium">Cant.</th>
                  <th className="pb-2 text-right font-medium">Precio</th>
                  <th className="pb-2 text-right font-medium no-print">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60 text-sm text-ink-soft">
                {cliente.fletes.map((flete) => {
                  const nombreLimpio = flete.tipoMaterial ? flete.tipoMaterial.split(' ')[0] : '';
                  const estilo = MATERIALES_CONFIG[nombreLimpio] || COLOR_DEFECTO;
                  const enEliminacion = eliminandoId === flete.id;

                  return (
                    <tr key={flete.id} className="hover:bg-paper/60">
                      <td className="py-2.5 text-xs text-ink-muted font-mono">
                        {formatFecha(flete.fecha)}
                      </td>
                      <td className="py-2.5">
                        <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded border ${estilo.bg} ${estilo.text} ${estilo.border}`}>
                          {flete.tipoMaterial}
                        </span>
                      </td>
                      <td className="py-2.5 text-center font-tabular text-ink">
                        <span className="font-mono bg-paper px-2 py-0.5 rounded text-ink-soft text-xs">
                          {flete.cantidad}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-tabular font-semibold text-ink">
                        ${formatMoney(flete.precio)}
                      </td>
                      <td className="py-2.5 text-right no-print">
                        <button
                          onClick={() => onEliminarFlete(cliente.id, flete.id)}
                          disabled={enEliminacion}
                          className="text-rust/80 hover:text-rust-dark font-medium text-xs transition px-2 py-1 rounded hover:bg-rust-light disabled:opacity-50"
                        >
                          {enEliminacion ? '…' : '✕'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-ink-muted italic text-center py-2">
            Este cliente no registra fletes de momento.
          </p>
        )}
      </div>
    </div>
  );
}
