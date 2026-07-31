# Arquitectura modular de QTE Lab v9

## Archivos principales

- `index.html`: entrada de GitHub Pages y estructura de las pantallas.
- `styles.css`: diseño de escritorio, móvil vertical y móvil horizontal.
- `data.js`: 100 cartas iniciales y decks iniciales en el esquema v9.
- `game-systems.js`: registro de botones, registro de fórmulas, migración de cartas y estadísticas.
- `emblem-system.js`: Strategy/Component System de emblemas.
- `main.js`: coordinación de interfaz, persistencia, editor y flujo de combate.

## Extender botones

```js
QTEGameSystems.ButtonRegistry.register("W", "W");
```

El editor y futuros controles pueden leer el registro sin cambiar las fórmulas.

## Extender fórmulas

```js
QTEGameSystems.FormulaRegistry.register("miFormula", (carda, contexto) => {
  return 0;
});
```

## Extender emblemas

Cada emblema hereda de `BaseEmblem` e implementa `createRuntime(context)`. El motor solo consume modificadores normalizados como:

- `timeMultiplier`
- `outgoingMultiplier`
- `incomingMultiplier`
- `healingRate`
- `hideSequenceAfter`
- `extraCardOnPerfect`
- `selfDamagePerError`
- `mirror`

Un emblema que necesite transformar la carta puede devolver una copia modificada en `card`.

```js
class NuevoEmblema extends QTEEmblems.BaseEmblem {
  constructor() {
    super({
      id: "nuevo",
      name: "Clan Nuevo",
      icon: "N",
      color: "#00ffaa",
      description: "Descripción"
    });
  }

  createRuntime(context) {
    return { outgoingMultiplier: 1.15 };
  }
}

QTEEmblems.registry.register(new NuevoEmblema());
```

No es necesario editar la resolución central del combate para registrar modificadores compatibles.

## Esquema de carta

```json
{
  "id": "card-golpe-tornado-1",
  "nombre": "Golpe Tornado",
  "poder_bruto": 2.35,
  "coeficiente": 0.184,
  "imageId": null,
  "secciones": [],
  "estadisticas": {
    "usos": 0,
    "victorias": 0,
    "derrotas": 0,
    "dano_promedio": 0,
    "tiempo_medio": 0,
    "precision_media": 0,
    "mejor_poder_neto": 0,
    "mayor_racha_perfecta": 0,
    "racha_perfecta_actual": 0
  }
}
```
