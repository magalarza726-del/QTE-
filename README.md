# QTE Lab 8.0 · GitHub Pages

Versión web estática de QTE Lab preparada para publicarse directamente en GitHub Pages. No necesita Python, Node.js, base de datos ni servidor propio.

## Archivos principales

- `index.html`: página principal que GitHub Pages abre automáticamente.
- `main.js`: punto de entrada y lógica completa de la aplicación.
- `styles.css`: interfaz y diseño adaptable.
- `data.js`: las 100 cartas y los tres decks iniciales.
- `.nojekyll`: evita que GitHub procese o excluya archivos mediante Jekyll.

Todos los enlaces son relativos (`./archivo`), por lo que funciona tanto en un dominio de usuario como en un repositorio de proyecto.

## Publicación en GitHub Pages

1. Crea un repositorio nuevo en GitHub.
2. Mantén la rama principal con el nombre `main`.
3. Sube **el contenido de esta carpeta**, no la carpeta contenedora. `index.html` debe verse en la raíz del repositorio.
4. En el repositorio abre **Settings → Pages**.
5. En **Build and deployment**, selecciona **Deploy from a branch**.
6. Escoge la rama `main`, la carpeta `/ (root)` y pulsa **Save**.
7. Espera a que GitHub muestre el enlace publicado.

Esta entrega contiene muy pocos archivos, por lo que no aparece el límite de 100 archivos de la carga web de GitHub.

## Multimedia y persistencia

GitHub Pages es de solo lectura: una aplicación publicada no puede escribir nuevas imágenes dentro del repositorio. Por esa razón:

- Cartas, decks y ajustes se guardan en `localStorage`.
- Imágenes de cartas, fondo de batalla, video y audio se guardan en `IndexedDB`.
- Cada navegador y dispositivo mantiene su propia copia.
- La pestaña **Datos** permite exportar e importar un respaldo completo, incluida la multimedia.

## Protección de las mecánicas

Las imágenes de cartas se muestran en un marco independiente con tamaño fijo y `object-fit: cover`. No se dibujan detrás del nombre, estadísticas o botones.

Durante batalla, el fondo se coloca detrás de tres paneles opacos: carta activa, secuencia y control Xbox. La protección de legibilidad viene activada y aplica estos límites:

- Fondo: máximo 35% de visibilidad.
- Capa oscura: mínimo 55%.
- Paneles de juego: fondo oscuro de alto contraste.

El usuario puede desactivar esta protección manualmente desde **Multimedia**, pero los paneles continúan separados del fondo.

## Funciones incluidas

- 100 cartas iniciales.
- Editor de cartas con 1 a 5 secciones.
- Acciones TAP y HOLD de 1,5 a 3,0 segundos.
- Validación del tiempo humano mínimo.
- Imagen individual para cada carta.
- Decks de 12 cartas y presets guardables.
- Rival automático en dificultad Fácil, Normal o Difícil.
- Combate por turnos con 20 puntos de vida.
- Control Xbox visual mediante clic o toque.
- Fondo de batalla con imagen o video.
- Transparencia, capa oscura y desenfoque configurables.
- Música de combate local.
- Respaldo completo en JSON.
- Diseño adaptable para escritorio, tableta y móvil.

## Fórmulas conservadas

```text
PoderBruto = NúmeroTotalDeAcciones / TiempoLímiteTotal

Si la carta contiene HOLD:
PoderBruto = PoderBruto + 0,05

PoderNeto = (BotonesCorrectos / TiempoReal) × (1 + Coeficiente)

Coeficiente = sqrt(N² / suma(frecuencia²)) / 10

Daño = PoderNeto
```

## Navegadores recomendados

Chrome, Edge, Firefox o Safari en versiones modernas. Para conservar archivos multimedia, el navegador debe permitir IndexedDB y almacenamiento local.
