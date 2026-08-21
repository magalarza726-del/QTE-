# QTE Lab v10.2.0

Juego web estático de construcción de mazos y combate QTE para GitHub Pages.

Esta versión parte de v10.1.1 y aplica una auditoría de estabilidad, refactor de persistencia y separación adicional del motor QTE.

## Sistemas principales

- 100 cartas iniciales y editor extensible.
- Emblemas y encantamiento aleatorio.
- 30 animaciones procedurales y secuenciador.
- Personajes stickman por código, partículas, cámara y efectos.
- Música exclusivamente importada por el usuario.
- Multimedia persistente mediante IndexedDB.
- Escritorio, móvil vertical y móvil horizontal.
- Exportación/importación de respaldo.

## Nuevos módulos v10.2

- `core/utils.js`
- `storage/persistence.js`
- `storage/media-db.js`
- `combat/qte-engine.js`

Consulta `AUDITORIA_V10_2.md`, `CAMBIOS_V10_2.md` y `PRUEBAS_V10_2.md` para detalles.

## GitHub Pages

`index.html` está en la raíz y todas las dependencias usan rutas relativas.
