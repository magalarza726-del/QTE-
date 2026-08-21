# Pruebas QTE Lab v10.2.0

## Estáticas

- 17 archivos JavaScript validados con `node --check`.
- CSS analizado sin bloques sin cerrar.
- 167 IDs HTML verificados como únicos.
- Referencias estáticas `#id` de `main.js` verificadas contra `index.html`.
- 100 cartas iniciales normalizadas.
- 30 animaciones registradas.
- 8 emblemas registrados.

## Reglas verificadas

Con 20 HP:

- Daño máximo por carta: 7.6.
- Daño máximo por turno: 11.6.
- Autodaño máximo de Asesino: 5.0.

## Migración

- Se conservan las claves v8 de localStorage e IndexedDB.
- Se normalizan cartas antiguas al iniciar.
- Música procedural continúa eliminada.

## Nota

El entorno de prueba no permitió navegación Chromium E2E, por lo que el navegador real debe ejecutar una prueba de humo tras desplegar en GitHub Pages.
