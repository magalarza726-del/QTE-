# QTE Lab v10.0 — Animaciones procedurales

Juego web estático de construcción de mazos, Emblemas y combate QTE, compatible con GitHub Pages.

## Novedades principales

- Quince técnicas reutilizables generadas completamente mediante código.
- Personajes tipo stickman construidos por partes independientes.
- Manos y pies coloreados según el Emblema activo.
- Seis niveles visuales vinculados a la precisión del QTE.
- Partículas, estelas, destellos, retroceso, zoom y sacudida de cámara.
- Efectos visuales independientes para los ocho clanes.
- Pestaña **Animación** en el editor de cartas.
- Previsualización sin iniciar una batalla.
- Sonidos procedurales mediante Web Audio.
- Pools reutilizables de partículas y estelas.
- Arquitectura preparada para sustituir el stickman por sprites mediante un adaptador de personaje.

## Funciones conservadas

- 100 cartas iniciales editables.
- Decks de 12 cartas.
- Ocho Emblemas estratégicos y encantamientos aleatorios.
- Poder Bruto, Poder Neto y coeficiente de diversidad.
- Estadísticas persistentes por carta.
- Imagen individual por carta.
- Fondo de batalla en imagen o video y transparencia regulable.
- Música personalizada.
- `localStorage`, `IndexedDB` y respaldos completos.
- Escritorio, móvil vertical y móvil horizontal.
- Entradas TAP; no existe mecánica HOLD.

## Publicación en GitHub Pages

Sube el contenido de esta carpeta a la raíz de la rama `main`. `index.html` debe quedar directamente en la raíz.

En GitHub:

1. Abre **Settings**.
2. Entra en **Pages**.
3. Selecciona **Deploy from a branch**.
4. Escoge `main` y `/ (root)`.

## Orden de carga

```text
index.html
  ├── data.js
  ├── animation/animation-registry.js
  ├── particles/particle-pool.js
  ├── camera/camera-controller.js
  ├── characters/stickman.js
  ├── effects/effect-system.js
  ├── game-systems.js
  ├── emblem-system.js
  ├── emblems/visual-emblems.js
  ├── combat/combat-visuals.js
  └── main.js
```

Consulta `CAMBIOS_V10_0.md`, `ARQUITECTURA_V10.md` y `PRUEBAS_V10_0.md`.
