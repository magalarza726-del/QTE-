# Guía rápida de publicación — QTE Lab v10.0

## Estructura correcta

```text
TuRepositorio/
├── .nojekyll
├── index.html
├── main.js
├── game-systems.js
├── emblem-system.js
├── data.js
├── styles.css
├── animation/
├── camera/
├── characters/
├── combat/
├── effects/
├── emblems/
├── particles/
└── README.md
```

`index.html` debe quedar directamente en la raíz de la rama `main`. No cambies los nombres de las carpetas porque los scripts usan rutas relativas.

## Desde la web de GitHub

1. Abre el repositorio.
2. Pulsa **Add file → Upload files**.
3. Arrastra todos los archivos y carpetas de esta entrega.
4. Confirma los cambios sobre `main`.
5. Ve a **Settings → Pages**.
6. Selecciona **Deploy from a branch**.
7. Configura `main` y `/ (root)`.
8. Guarda.

GitHub Pages publicará `index.html` como entrada principal.

## Datos de los jugadores

El progreso no se escribe en GitHub. Permanece en `localStorage` e `IndexedDB` del navegador de cada jugador. Para moverlo a otro dispositivo usa **Datos → Descargar respaldo** e **Importar respaldo**.
