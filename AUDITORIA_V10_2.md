# Auditoría QTE Lab v10.2.0

La auditoría se realizó sobre v10.1.1 sin reescribir el proyecto.

## Errores corregidos

- El manifiesto de encantamientos podía volver a sortearse al iniciar el combate.
- El modo seguro de fondo sobrescribía los valores elegidos por el usuario.
- Sustituir imágenes, fondos o pistas podía borrar primero el recurso anterior y fallar después.
- La restauración de respaldo podía dejar IndexedDB parcialmente restaurado.
- La precisión en vivo y la precisión final utilizaban criterios distintos.
- Temporizadores iniciados exactamente en 0 ms podían tratarse como no iniciados.
- Las pausas de secuencias de animación no respetaban el multiplicador global de duración.
- Algunas técnicas podían aplicar retroceso dos veces.
- Parte de la animación dependía de un paso fijo aproximado a 60 FPS.
- Había lógica duplicada de persistencia y utilidades dentro de main.js.

## Refactor

Se introdujeron módulos independientes:

- `core/utils.js`: utilidades puras y sanitización.
- `storage/persistence.js`: persistencia JSON versionada.
- `storage/media-db.js`: IndexedDB, transacciones y URLs de objeto.
- `combat/qte-engine.js`: sesión QTE desacoplada de la interfaz.

`main.js` permanece como coordinador de UI y estado, pero deja de implementar directamente estas responsabilidades.

## Compatibilidad

Se mantiene `qte-lab-pages-v8` y `qte-lab-media-v8` para no perder cartas, decks ni multimedia existentes. La migración sigue siendo automática.

## Estado

Versión: **10.2.0**  
Build: **10.2.0-20260821**
