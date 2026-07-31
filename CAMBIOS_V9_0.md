# QTE Lab v9.0 — Emblemas y estrategia

Esta versión actualiza directamente QTE Lab v8.2 Responsive. Conserva el editor, los decks, el combate, multimedia, respaldos, IndexedDB, GitHub Pages y los tres modos de interfaz.

## Sistemas incorporados

- Pantalla de Emblemas previa al constructor de decks.
- Selección independiente de 1 a 4 emblemas para jugador y rival.
- Encantamiento aleatorio de las 12 posiciones del deck:
  - 1 emblema: 12 cartas.
  - 2 emblemas: 6 cartas por emblema.
  - 3 emblemas: 4 cartas por emblema.
  - 4 emblemas: 3 cartas por emblema.
- Manifiesto completo de encantamientos visible desde el comienzo del combate.
- Vista previa y resorteo desde el constructor.
- Indicador, nombre, color y tooltip del emblema en cada carta.

## Emblemas implementados

- Clan Sombra: oculta la secuencia después de 0,75 s y habilita una carta adicional si la ejecución es perfecta.
- Clan Asesino: daño ×2 y autodaño por cada entrada incorrecta, basado en el daño perfecto hipotético.
- Clan Curandero: cura el 20 % del daño efectivo infligido.
- Clan Tempo: tiempo ×2 y daño ×0,70.
- Clan Escudero: daño recibido ×0,85 durante el intercambio.
- Clan Caos: remapea los controles de dos secciones aleatorias y aplica daño ×3.
- Clan Venganza: daño ×1,25 cuando la vida es inferior al 35 %.
- Clan Espejo: intercambia las cartas elegidas antes de ejecutar el QTE.

## Fórmulas

- Poder Bruto = botones totales / tiempo límite total.
- Poder Neto = (botones correctos / tiempo real) × (1 + coeficiente).
- Coeficiente = sqrt(N² / suma de frecuencias²) / 10.

Las fórmulas están registradas en `game-systems.js` y pueden sustituirse o ampliarse sin reescribir el combate.

## Estadísticas por carta

- Usos.
- Victorias.
- Derrotas.
- Daño promedio efectivo.
- Tiempo medio.
- Precisión media.
- Mejor Poder Neto.
- Mayor racha perfecta.

El editor incorpora la pestaña de solo lectura `Estadísticas`.

## Compatibilidad

- Los datos v8 se migran automáticamente.
- Se conserva la clave local anterior para no perder cartas ni decks.
- Los respaldos antiguos siguen siendo importables.
- El nuevo respaldo incluye emblemas, encantamientos, multimedia y estadísticas.
