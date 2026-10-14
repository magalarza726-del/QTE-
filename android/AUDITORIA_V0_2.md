# Auditoría técnica QTE Lab Android v0.2

## Arquitectura

- Kotlin nativo + Jetpack Compose.
- Sin WebView.
- Sin permiso `INTERNET` en el APK.
- Persistencia privada mediante `qte_state.json` + carpeta `media/`.
- Respaldo JSON portable con multimedia Base64.
- La raíz del repositorio continúa sirviendo GitHub Pages; Android vive aislado en `android/`.

## Sistemas portados

- 100 cartas iniciales obtenidas del `data.js` de la versión web durante la compilación del monorepo.
- Fórmulas de Poder Bruto, Coeficiente de Variación y Poder Neto.
- 8 emblemas y su distribución aleatoria.
- Decks de 12 cartas, mano de 3 y tres dificultades de IA.
- 30 IDs de animaciones y secuencias de hasta 16 pasos en el modelo de carta.
- Editor de cartas y estadísticas.
- Controles táctiles + gamepad físico básico.
- Fondo de batalla local y modo seguro de legibilidad.
- Biblioteca de hasta 20 pistas importadas por el usuario, sin música procedural.
- Selección musical aleatoria sin repetición inmediata cuando sea posible.
- Importación/exportación JSON.

## Validaciones locales

El núcleo Kotlin puro fue compilado y sometido a smoke tests con `kotlinc`:

- 4 botones / 2 s => Poder Bruto 2.0.
- Una entrada incorrecta aumenta errores y no avanza la secuencia.
- 3 emblemas sobre 12 posiciones => distribución 4/4/4.
- Daño máximo por una carta con 20 PV => 7.6.

## Verificación de Android

La compilación integral se realiza en GitHub Actions mediante JDK 17, Android SDK 35 y Gradle 8.9. El workflow ejecuta primero `testDebugUnitTest` y después `assembleDebug`.

## Límites actuales

El renderer Android es todavía una representación procedural simplificada. Los datos de las 30 técnicas y las secuencias ya están desacoplados del motor, de modo que la capa visual puede seguir acercándose a la versión web sin cambiar los archivos JSON ni las reglas de combate.
