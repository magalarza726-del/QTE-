# Migración Web ↔ Android

El objetivo es que QTE Lab web y Android compartan conceptos y, progresivamente, el mismo backup.

## Campos conservados

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

El decoder Android acepta animaciones individuales y secuencias donde cada paso tenga los parámetros directamente o dentro de `animation`, como en la web v10.x.

## Multimedia

La web usa IndexedDB; Android copia los archivos al almacenamiento privado de la app. En el backup ambos se pueden representar mediante `dataUrl` Base64.

## Próximos pasos de compatibilidad

- Biblioteca de música Android.
- Fondo de batalla imagen/video.
- Biblioteca de animaciones personalizadas.
- Renderer procedural completo.
- Importación selectiva (solo cartas / solo decks / configuración completa).
