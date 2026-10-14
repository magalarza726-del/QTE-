# Auditoría técnica v0.1

## Validaciones realizadas

- `initial_data.json`: JSON válido.
- Recursos XML: parseo válido.
- 100 cartas iniciales cargadas.
- 3 decks iniciales de 12 cartas.
- 30 técnicas registradas en `AnimationCatalog`.
- 8 emblemas registrados.
- Núcleo Kotlin puro (`Models`, `Formulas`, `Emblems`, `Balance`, `QteEngine`) compilado con `kotlinc`.
- Smoke test ejecutado correctamente:
  - Poder Bruto 2.0 para 4 botones / 2 s.
  - Un botón incorrecto no avanza el QTE.
  - Un QTE correcto finaliza con el conteo esperado.
  - 3 emblemas distribuyen 4/4/4 sobre 12 posiciones.
  - límite de daño por carta = 7.6 con 20 PV.
- No se detectaron errores sintácticos `expecting ...` al parsear las fuentes Kotlin completas; las referencias Android/Compose no pueden resolverse en este entorno porque no incluye SDK/artefactos Android.

## Riesgos conocidos de esta primera migración

- El renderer procedural Android todavía es una capa visual básica; el modelo ya admite los 30 movimientos y secuencias.
- Sombra y Caos tienen datos/UI, pero faltan sus efectos avanzados completos dentro del motor Android.
- La biblioteca de música y el fondo imagen/video del prototipo web aún no tienen pantalla nativa en v0.1.
- La integración Gradle completa debe verificarse en Android Studio con SDK 37 y conexión para resolver dependencias por primera vez.
