import React from 'react';

const ESTILOS = {
  exito: { bg: 'bg-pine', icon: '✓' },
  error: { bg: 'bg-rust', icon: '!' }
};

export default function ToastStack({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 no-print"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const estilo = ESTILOS[t.tipo] || ESTILOS.exito;
        return (
          <div
            key={t.id}
            className={`${estilo.bg} text-white rounded-lg shadow-ticket px-4 py-3 pr-3 flex items-start gap-3 max-w-sm animate-[fadeIn_.15s_ease-out]`}
          >
            <span className="font-display font-bold text-lg leading-none mt-0.5" aria-hidden="true">
              {estilo.icon}
            </span>
            <p className="text-sm leading-snug flex-1">{t.mensaje}</p>
            <button
              onClick={() => onDismiss(t.id)}
              className="text-white/70 hover:text-white text-sm leading-none px-1"
              aria-label="Cerrar notificación"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
