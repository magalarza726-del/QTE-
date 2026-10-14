# QTE Lab Android v0.2.0

Port nativo de QTE Lab a **Kotlin + Jetpack Compose**. Esta carpeta puede abrirse directamente como proyecto en Android Studio y no modifica la aplicación GitHub Pages de la raíz del repositorio.

## Objetivos de esta versión

- funcionamiento **100 % offline en tiempo de ejecución**;
- interfaz táctil para vertical, horizontal y tablet;
- creación y edición de cartas;
- QTE con botones grandes y soporte básico para gamepad físico;
- decks de 12 cartas y emblemas;
- importación/exportación de un respaldo `.json` portable;
- imágenes de cartas, fondo de batalla y música almacenados localmente;
- hasta 20 pistas de música importadas por el usuario, con selección aleatoria por combate;
- mismas fórmulas base y balance del prototipo web;
- 100 cartas iniciales incluidas dentro del APK.

## Compilar con Android Studio

1. Abre la carpeta `android` en Android Studio.
2. Usa JDK 17.
3. Deja que Gradle sincronice el proyecto.
4. Ejecuta `app` en un dispositivo o emulador.
5. Para generar un APK: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

Configuración del proyecto:

- Android Gradle Plugin: 8.7.3
- Gradle: 8.9
- Kotlin: 2.0.21
- compileSdk / targetSdk: 35
- minSdk: 26
- applicationId: `ec.qtelab.mobile`

## Compilar en GitHub

El repositorio incluye `.github/workflows/qte-android-apk.yml`.

Cada cambio dentro de `android/` ejecuta pruebas y `assembleDebug`. El APK aparece en:

**Actions > Build QTE Lab Android APK > Artifacts > QTE-Lab-Android-debug**

El APK `debug` está firmado automáticamente por Android y puede instalarse para pruebas sin configurar secretos.

## Persistencia offline

La app no declara permiso `INTERNET`. Guarda todo en el almacenamiento privado de Android:

- `qte_state.json`: cartas, decks, emblemas y configuración;
- `media/`: imágenes, fondos y audio importado.

Cerrar la aplicación o reiniciar el teléfono no elimina el progreso.

## Importar / exportar JSON

En **Datos**:

- `Exportar .json` crea un respaldo completo;
- `Importar .json` restaura ese respaldo;
- la multimedia se empaqueta como Base64 para que el archivo pueda enviarse a otra persona.

La estructura mantiene compatibilidad conceptual con el backup de QTE Lab Web (`state` + `media`).

## Estado del port

Esta versión ya porta el núcleo jugable, pero la capa procedural de animaciones de la web seguirá evolucionando en Android. El modelo de `AnimationConfig` y las secuencias ya están separados del motor de combate para poder portar las animaciones sin rehacer cartas ni reglas.
