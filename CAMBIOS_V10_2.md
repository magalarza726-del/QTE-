# QTE Lab v10.2.0

## Auditoría y estabilidad

- Encantamientos congelados entre previsualización e inicio de combate.
- Modo seguro no destructivo: limita el render, no reescribe preferencias.
- Reemplazo seguro de multimedia: primero se confirma el nuevo recurso y después se limpia el anterior.
- Restauración atómica de IndexedDB.
- Precisión unificada entre HUD, Poder Neto y estadísticas.
- Temporización basada en marcas `null` y no en valores truthy.
- Mejor manejo de errores de persistencia.

## Refactor

- Nuevo `core/utils.js`.
- Nuevo `storage/persistence.js`.
- Nuevo `storage/media-db.js`.
- Nuevo `combat/qte-engine.js`.
- `main.js` reducido como responsable directo de infraestructura.
- `combat/combat-visuals.js` usa delta temporal real y evita retrocesos duplicados.
- `animation/animation-registry.js` normaliza pausas y duración de secuencias.

## GitHub Pages

- Versión visible actualizada a 10.2.0.
- Build único `10.2.0-20260821` en CSS/JS para invalidar caché.
- Se conserva `.nojekyll` y todas las rutas son relativas.
