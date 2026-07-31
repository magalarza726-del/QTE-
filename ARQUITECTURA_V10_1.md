# Arquitectura v10.1

## Balance desacoplado

`combat/balance-system.js` concentra las reglas globales de daño, autodaño, curación y límites por turno. El motor de interfaz no contiene multiplicadores de balance duplicados.

Funciones principales:

- `executionBaseDamage()`
- `allocateDamage()`
- `selfDamage()`
- `sideSelfDamage()`
- `healing()`
- `incomingMultiplier()`

## Registro de animaciones

`animation/animation-registry.js` contiene:

- Registro de 30 técnicas.
- Normalización de técnicas individuales.
- Normalización de secuencias.
- Cálculo de duración total.
- Etiquetas y muestreo procedural de poses.

Formato individual:

```json
{
  "mode": "single",
  "type": "uppercut",
  "name": "Uppercut eléctrico",
  "speed": 1.1,
  "duration": 0.9,
  "impacts": 1
}
```

Formato secuencial:

```json
{
  "mode": "sequence",
  "name": "Combo del eclipse",
  "sequence": [
    {"animation":{"type":"dash","speed":1.2,"duration":0.8},"pauseAfter":0.1},
    {"animation":{"type":"uppercut","speed":1,"duration":0.9},"pauseAfter":0.12},
    {"animation":{"type":"explosion","speed":0.9,"duration":1.2},"pauseAfter":0}
  ]
}
```

## Reproducción visual

`combat/combat-visuals.js` reproduce cada paso de una secuencia de forma consecutiva. El HUD recibe un callback por paso y actualiza la técnica actual.

El multiplicador de duración de combate está expuesto como:

```js
QTECombatVisuals.COMBAT_DURATION_SCALE
```

## Música

`audio/music-system.js` incorpora:

- Registro de diez pistas procedurales.
- Sintetizador basado en Web Audio.
- Programación rítmica por pasos.
- Selección aleatoria que evita repetir la pista anterior.
- Compatibilidad con audios importados gestionados por `MediaDB`.

## Persistencia

Los presets personalizados se guardan en:

```text
settings.customAnimations
```

Las pistas importadas se registran en:

```text
settings.musicTracks
```

Los archivos binarios permanecen en IndexedDB.
