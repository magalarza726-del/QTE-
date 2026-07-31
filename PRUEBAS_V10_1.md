# Pruebas v10.1

## Validaciones automáticas realizadas

- Sintaxis de todos los archivos JavaScript con `node --check`.
- 30 identificadores de animación únicos.
- Normalización de secuencias de animaciones.
- Persistencia de secuencias mediante `CardSchema`.
- Multiplicador final de duración superior a 2 veces v10.0.
- 10 pistas musicales procedurales registradas.
- Selección aleatoria sin repetición inmediata.
- Multiplicadores rebalanceados de Asesino y Caos.
- Límite de 7,6 puntos de daño por carta sobre 20 de vida.
- Límite de 11,6 puntos de daño por turno.
- Límite de 5 puntos de autodaño por turno.
- Carga de `main.js` con sus módulos y exportación de `QTECore`.
- Verificación de que todos los ID consultados por `main.js` existen en `index.html`.
- Verificación de ausencia de ID HTML duplicados.

## Caso equivalente a la captura

Supuesto:

- Rival con Clan Asesino.
- 14 errores.
- Daño perfecto teórico superior al límite.

Resultado v10.1:

```text
Autodaño máximo: 5,00
Daño rival máximo por turno: 11,60
Reducción total máxima desde vida completa: 16,60 / 20
```

El rival conserva al menos 3,40 de vida y no puede morir desde vida completa en el primer turno.

## Resoluciones objetivo

- Escritorio: 1440 × 900.
- Móvil vertical: 390 × 844.
- Móvil horizontal: 844 × 390.

Las reglas responsive existentes se conservaron y se añadieron estilos específicos para el secuenciador y la biblioteca musical.
