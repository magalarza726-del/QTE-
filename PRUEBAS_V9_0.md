# Pruebas realizadas — QTE Lab v9.0

## Sintaxis

- `data.js`: correcto.
- `game-systems.js`: correcto.
- `emblem-system.js`: correcto.
- `main.js`: correcto.

## Fórmulas y datos

- Poder Bruto validado contra botones/tiempo.
- Coeficiente validado contra N²/suma de cuadrados.
- Poder Neto validado con casos controlados.
- Las 100 cartas iniciales incluyen el esquema v9.
- La migración completa estadísticas ausentes sin borrar datos existentes.

## Emblemas

- 1 emblema: 12 asignaciones.
- 2 emblemas: 6 + 6.
- 3 emblemas: 4 + 4 + 4.
- 4 emblemas: 3 + 3 + 3 + 3.
- Sin posiciones vacías ni dobles asignaciones.
- Modificadores de los ocho clanes comprobados.
- Caos modifica dos secciones.

## Navegador

Resoluciones probadas:

- Escritorio: 1440 × 900.
- Móvil vertical: 390 × 844.
- Móvil horizontal: 844 × 390.

Comprobaciones:

- Inicio, Cartas, Emblemas, Decks, Batalla, Multimedia y Datos navegables.
- Sin desbordamiento horizontal.
- 16 opciones de emblema visibles.
- 24 espacios de deck con información y encantamiento.
- Inicio y resolución de un turno QTE real.
- Resultado con 10 indicadores.
- Editor con ocho estadísticas de solo lectura.
