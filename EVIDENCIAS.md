# Evidencias del proyecto

## Despliegue en producción

- Plataforma: Vercel.
- URL de la aplicación: https://freightbd-dashboard.vercel.app/
- Endpoint de salud: https://freightbd-dashboard.vercel.app/api/ping
- Respuesta comprobada: `{"ok":true}`.
- Base de datos: MongoDB Atlas.
- Persistencia comprobada durante la migración: 9 clientes y 11 fletes.

Adjuntar a la entrega una captura de la aplicación funcionando y otra del
endpoint `/api/ping`.

## Pruebas locales

Comandos ejecutados:

```bash
npm test
npm run build
```

Resultado esperado:

- 2 pruebas exitosas.
- Build de Vite generado correctamente en `dist/`.

## Integración externa

El backend consulta Open-Meteo en `GET /api/weather`. El dashboard muestra la
ubicación, temperatura y condición meteorológica cuando el servicio responde.
Si Open-Meteo no está disponible, la aplicación principal continúa funcionando.

## CI/CD

El workflow `.github/workflows/ci.yml` ejecuta automáticamente:

1. Instalación de dependencias.
2. Pruebas automatizadas.
3. Build de producción.

Completar antes de la presentación con el enlace de la ejecución de GitHub
Actions y una captura del resultado exitoso:

- Workflow CI: `PENDIENTE: pegar enlace de GitHub Actions`.

## Control de versiones

- Repositorio: https://github.com/Rappu10/freightbd-dashboard
- Rama de producción: `main`.
- Pull Request del equipo: `PENDIENTE: pegar enlace real`.
- Evidencia de ramas y revisión: `PENDIENTE: adjuntar captura`.

No se deben inventar enlaces o capturas; esos elementos deben salir de GitHub y
Vercel después de la ejecución real.
