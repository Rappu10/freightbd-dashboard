import React, { useEffect, useRef } from 'react';

export default function ConfirmModal({ open, titulo, mensaje, onCancel, onConfirm, cargando }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="bg-paper-card rounded-2xl max-w-md w-full p-6 shadow-xl border border-line"
      >
        <div className="flex items-center gap-3 text-rust mb-3">
          <span className="text-2xl" aria-hidden="true">⚠️</span>
          <h4 id="confirm-title" className="text-lg font-display font-semibold text-ink">{titulo}</h4>
        </div>
        <p id="confirm-message" className="text-sm text-ink-muted leading-relaxed mb-6">
          {mensaje}
        </p>
        <div className="flex justify-end gap-2">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="px-4 py-2 bg-paper hover:bg-line/60 text-ink text-sm font-semibold rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={cargando}
            className="px-4 py-2 bg-rust hover:bg-rust-dark disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition shadow-sm"
          >
            {cargando ? 'Eliminando…' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
