export function formatMoney(n) {
  const num = Number(n) || 0;
  return num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatFecha(iso) {
  if (!iso) return 'S/F';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

// Número de ticket corto y legible a partir de un UUID, solo para mostrar
// en pantalla (no es un identificador real, el id completo sigue siendo el UUID).
export function ticketNumero(id) {
  if (!id) return '000000';
  return id.replace(/-/g, '').slice(0, 6).toUpperCase();
}
