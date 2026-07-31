# Pruebas realizadas — QTE Lab v10.0

## Sintaxis

Se validaron con `node --check`:

- `data.js`
- `game-systems.js`
- `emblem-system.js`
- `main.js`
- todos los módulos de `animation/`, `effects/`, `particles/`, `camera/`, `combat/`, `emblems/` y `characters/`.

## Técnicas

Se evaluaron las 15 técnicas en 101 puntos de su línea temporal. No se encontraron valores `NaN`, impactos fuera del intervalo ni configuraciones inválidas.

## Esquema

- 100 de 100 cartas iniciales poseen el campo `animation`.
- Los respaldos antiguos reciben una animación durante la migración.
- El editor conserva los parámetros al guardar.

## Interfaz responsive

Resoluciones probadas:

- Escritorio: `1440 × 900`.
- Móvil vertical: `390 × 844`.
- Móvil horizontal: `844 × 390`.

En Inicio, Cartas, Emblemas, Decks, Multimedia y Datos no se detectó desbordamiento horizontal.

## Editor

- Apertura de la pestaña Animación.
- Lectura y modificación de parámetros.
- Previsualización procedural.
- Canvas con dimensiones válidas en los tres diseños.
- Cambio de Emblema y precisión de prueba.

## Combate

Se completó un turno real:

1. selección de carta;
2. ejecución completa del QTE;
3. ocultamiento automático de la interfaz;
4. animación del jugador;
5. contraataque rival;
6. aplicación de daño y estadísticas;
7. pantalla de resultado.

También se verificó el flujo especial de Clan Sombra antes de seleccionar la carta adicional.

## Consola

No se registraron errores de JavaScript durante las pruebas automatizadas.
