const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=19.4326&longitude=-99.1332&current=temperature_2m,weather_code&timezone=America%2FMexico_City';

const WEATHER_LABELS = {
  0: 'Cielo despejado',
  1: 'Principalmente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Niebla',
  48: 'Niebla escarchada',
  51: 'Llovizna ligera',
  53: 'Llovizna moderada',
  55: 'Llovizna intensa',
  61: 'Lluvia ligera',
  63: 'Lluvia moderada',
  65: 'Lluvia intensa',
  80: 'Chubascos ligeros',
  81: 'Chubascos moderados',
  82: 'Chubascos intensos',
  95: 'Tormenta'
};

async function obtenerClima() {
  const response = await fetch(WEATHER_URL, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Open-Meteo respondió ${response.status}`);

  const data = await response.json();
  const current = data.current || {};
  return {
    ubicacion: 'Ciudad de México',
    temperatura: current.temperature_2m,
    unidad: data.current_units?.temperature_2m || '°C',
    condicion: WEATHER_LABELS[current.weather_code] || 'Condición no disponible',
    actualizado: current.time || null
  };
}

module.exports = { obtenerClima };