// En desarrollo usa localhost:4000. En producción, define VITE_API_URL en
// Vercel (Settings > Environment Variables) apuntando a tu backend de Render,
// ej. https://freightbd-server.onrender.com/api
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export class SesionExpiradaError extends Error {}

/**
 * Envoltorio de fetch que agrega el token, castea la respuesta a JSON y
 * lanza un Error con el mensaje que mande el backend cuando algo falla.
 * Si el backend responde 401, lanza SesionExpiradaError para que la app
 * pueda mandar al usuario de vuelta al login.
 */
export async function apiFetch(path, { token, ...options } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
  } catch (err) {
    throw new Error('No se pudo conectar con el servidor. Revisa tu conexión.');
  }

  if (res.status === 401) {
    throw new SesionExpiradaError('Tu sesión expiró. Vuelve a iniciar sesión.');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // respuesta sin cuerpo (ej. algunos 204), no es un error por sí mismo
  }

  if (!res.ok) {
    throw new Error((data && data.error) || 'Ocurrió un error inesperado.');
  }

  return data;
}
