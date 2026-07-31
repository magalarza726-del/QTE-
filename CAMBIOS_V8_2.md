# QTE Lab v8.2 · Diseño adaptable

## Nuevos modos

- **Automático:** detecta tamaño, orientación y tipo de puntero.
- **Escritorio:** navegación superior, paneles amplios y batalla en tres columnas.
- **Móvil vertical:** navegación inferior, contenido apilado y editor a pantalla completa.
- **Móvil horizontal:** interfaz compacta, decks comparables y batalla QTE en tres columnas.

## Persistencia

La preferencia de diseño se guarda dentro de `settings.layoutMode` en `localStorage`. En modo automático, la interfaz se recalcula al cambiar el tamaño o girar el dispositivo.

## Compatibilidad

Se conserva `index.html` como entrada de GitHub Pages. No se añadió ninguna dependencia externa ni se requiere servidor.
