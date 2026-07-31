# Arquitectura visual modular — QTE Lab v10

## Carpetas

```text
animation/   Registro y muestreo de técnicas.
effects/     Perfiles de precisión, destellos, estelas y sonido.
particles/   Pool reutilizable de partículas.
camera/      Seguimiento, vibración y zoom.
combat/      Orquestación del lienzo y secuencias visuales.
emblems/     Apariencia y efectos visuales de cada clan.
characters/  Implementación procedural y registro de adaptadores.
```

## Separación entre reglas y representación

El motor estratégico continúa en:

- `game-systems.js`
- `emblem-system.js`
- `main.js`

La capa visual consume un resultado ya calculado:

```js
{
  card,
  runtime,
  result: {
    accuracy,
    netPower,
    correct,
    incorrect,
    realTime
  }
}
```

La animación no recalcula daño ni altera las reglas. Solo representa el resultado.

## Esquema de animación de una carta

```json
{
  "animation": {
    "type": "straight-punch",
    "speed": 1,
    "distance": 150,
    "impacts": 1,
    "duration": 0.82,
    "jumpHeight": 70,
    "effectSize": 1,
    "trailLength": 0.72,
    "cameraShake": 0.55,
    "sound": "impact"
  }
}
```

## Añadir una técnica

```js
QTEAnimations.register({
  id: "mi-tecnica",
  label: "Mi técnica",
  trailPart: "frontHand",
  impactTimes: config => [0.62],
  sample: (progress, config) => ({
    ...QTEAnimations.basePose(),
    x: config.distance * progress,
    armFront: -0.2
  })
});
```

El editor puede obtener el nombre desde el registro y las cartas solo referencian `mi-tecnica`.

## Añadir un efecto visual de Emblema

Los efectos estratégicos y visuales están separados. El clan conserva su regla en `emblem-system.js`; su representación vive en `emblems/visual-emblems.js`.

```js
class NuevoVisual extends QTEVisualEmblems.VisualEmblem {
  constructor() {
    super({ id: "nuevo", color: "#00ffaa", glow: 16 });
  }

  drawBefore(ctx, character, pose, runtime, time, intensity) {
    // Aura o efecto previo al personaje.
  }
}

QTEVisualEmblems.registry.register(new NuevoVisual());
```

No se modifica el motor principal del combate.

## Sustituir stickman por sprites

`characters/stickman.js` expone un registro de adaptadores:

```js
QTECharacters.register("sprite", options => new SpriteCharacter(options));
```

El adaptador futuro debe mantener la interfaz:

- `setPosition(x, ground)`
- `anchors(pose)`
- `draw(ctx, pose, visual)`
- `updateRecoil(dt)`

Las cartas, las técnicas, los resultados del QTE y los Emblemas no necesitan cambios.

## Rendimiento

- No se crean partículas por medio de `new` durante cada impacto.
- Los pools se reciclan.
- El escenario usa gradientes cacheados.
- La actualización se basa en `deltaTime`.
- El tamaño interno del canvas se adapta al dispositivo y limita el DPR.
