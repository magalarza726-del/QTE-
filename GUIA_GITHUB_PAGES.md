# Guía rápida de publicación

## Estructura correcta del repositorio

```text
TuRepositorio/
├── .nojekyll
├── index.html
├── main.js
├── data.js
├── styles.css
├── README.md
├── GUIA_GITHUB_PAGES.md
└── CAMBIOS_V8_1.md
```

El archivo importante es `index.html`: debe quedar directamente en la raíz de la rama `main`.

## Desde la web de GitHub

1. Abre el repositorio.
2. Pulsa **Add file → Upload files**.
3. Arrastra todos los archivos de esta carpeta.
4. Escribe un mensaje como `Publicar QTE Lab 8.1`.
5. Confirma con **Commit changes** sobre `main`.
6. Ve a **Settings → Pages**.
7. Selecciona **Deploy from a branch**.
8. Configura `main` y `/ (root)`.
9. Guarda.

## Actualizaciones futuras

Sustituye `index.html`, `main.js`, `styles.css` o `data.js` en la misma rama `main`. GitHub Pages volverá a publicar automáticamente.

Los cambios guardados por cada jugador no se suben al repositorio: permanecen en su navegador. Para moverlos a otro equipo usa **Datos → Descargar respaldo** y luego **Importar respaldo**.
