# QTE Lab Android (APK offline)

Esta carpeta conserva el juego web existente: el APK empaqueta index.html, JS, CSS y todos los módulos originales. No se conecta a ningún servidor para jugar. Requiere Android 7.0 o superior (API 24).

## GitHub Actions
Abre un Pull Request de esta rama contra main. En **Actions**, busca `QTE Lab - Android APK offline`. Cuando finalice correctamente, descarga el artefacto `QTE-Lab-Android-offline-debug` para obtener `app-debug.apk`.

La compilación usa Java 17, Gradle 8.9, AGP 8.7.3 y Android SDK 35. Las dependencias solo se descargan durante la compilación en GitHub, no al ejecutar la aplicación.

## Android Studio
Abre la carpeta `android/` dentro del repositorio completo. La web debe estar disponible en la carpeta padre (../index.html). Sin wrapper Gradle incluido, puede ser necesario configurar Gradle 8.9 o ejecutar `gradle wrapper --gradle-version 8.9` una vez. Ejecuta `assembleDebug`.

## Incluye
- WebViewAssetLoader con origen HTTPS interno y sin permiso INTERNET.
- Editor de cartas, barajas, emblemas y combate existentes.
- Persistencia local con localStorage e IndexedDB.
- Archivos locales elegidos mediante selector nativo.
- Exportación de respaldo JSON mediante el selector de Android.

## Pendiente de validar en un teléfono
Prueba inicio, QTE táctiles, todos los emblemas, importación multimedia, exportación e importación de respaldo y cierre/reapertura. Esta versión no agrega lector QR ni multijugador online.

La rama no modifica los archivos originales de la web; Android solo los empaqueta.
