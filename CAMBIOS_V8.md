# Cambios de QTE Lab 8.0

## Conversión completa a web estática

- Se reemplazó la dependencia de PySide6 por HTML, CSS y JavaScript puro.
- Se añadió `index.html` como entrada de GitHub Pages.
- Se añadió `main.js` como entrada principal de la aplicación.
- Todas las rutas son relativas y no existe dependencia de un backend.
- Las 100 cartas iniciales se incluyen en `data.js`.

## Arte de cartas

- Cada carta admite una imagen propia.
- El editor permite adjuntar, sustituir o eliminar la imagen.
- La imagen se recorta dentro de una zona fija.
- Ningún texto, estadística o botón se coloca encima del arte.
- En combate, el arte se reduce a una miniatura lateral separada del QTE.

## Fondo de batalla

- Se admiten imágenes y videos.
- Se añadió control de visibilidad del fondo.
- Se añadió control de opacidad de la capa oscura.
- Se añadió desenfoque configurable.
- El modo de protección de legibilidad viene activado.
- El fondo nunca captura clics ni se coloca sobre las mecánicas.

## Persistencia

- Cartas, decks y ajustes: `localStorage`.
- Multimedia: `IndexedDB`.
- Exportación e importación de respaldo completo.
- Restauración de cartas iniciales y borrado selectivo de multimedia.

## Combate

- Control Xbox visual compatible con mouse y pantalla táctil.
- TAP y HOLD.
- Secciones con tiempo límite.
- Rival automático en tres dificultades.
- Vida, daño, precisión y resultados por turno.
- Fondo y música globales durante toda la batalla.
