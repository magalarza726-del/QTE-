# Migración QTE Lab Web ↔ Android

La versión Android conserva el modelo conceptual de QTE Lab web para que cartas, decks y configuración puedan viajar mediante JSON.

## Estado compartido

- `cards`
- `decks`
- `playerDeck`
- `enemyDeck`
- `settings`
- `enchantments`
- `media`
- `nombre`, `secciones`, `tiempo`, `botones`
- `poder_bruto`, `coeficiente`
- `estadisticas`
- `animation`

El decoder Android acepta técnicas individuales y secuencias donde cada paso contiene sus parámetros directamente o dentro de `animation`, como en la rama web v10.x.

## Datos iniciales en el monorepo

Para evitar mantener dos copias de las 100 cartas, el proyecto Android genera `initial_data.json` desde el `data.js` de la raíz durante `preBuild` cuando el asset no está incluido. El ZIP independiente de Android sí puede llevar el asset integrado.

## Multimedia

La web persiste multimedia con IndexedDB. Android la copia al almacenamiento privado de la aplicación. En un respaldo portable ambos formatos pueden transportar archivos mediante `dataUrl` Base64.

Android v0.2 ya contempla:

- imágenes de cartas;
- fondo de batalla local;
- música importada por el usuario;
- hasta 20 pistas;
- selección aleatoria por combate.

## Compatibilidad futura

Las siguientes etapas pueden ampliar la importación selectiva y el renderer procedural sin cambiar el esquema base de cartas, decks, emblemas y secuencias.
