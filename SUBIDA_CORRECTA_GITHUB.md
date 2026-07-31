# Subida correcta de QTE Lab v10.0.1

## Lo importante

No subas este ZIP como un único archivo al repositorio. Descomprímelo y sube **su contenido interno**.

La raíz publicada debe verse así:

```text
index.html
styles.css
data.js
main.js
game-systems.js
emblem-system.js
animation/
camera/
characters/
combat/
effects/
emblems/
particles/
version.json
.nojekyll
```

No debe quedar así:

```text
QTE_Lab_GitHub_Pages_v10_0_1_Deploy_Fix/index.html
```

si GitHub Pages está configurado para publicar desde la raíz.

## Reemplazo limpio

1. Conserva una copia del repositorio actual.
2. En la rama que publica Pages, elimina o reemplaza el `index.html` antiguo.
3. Sube todos los archivos internos de esta entrega a esa misma raíz.
4. Comprueba que al abrir `index.html` en GitHub aparezca `GitHub Pages · v10.0.1`.
5. Comprueba que `version.json` muestre el build `10.0.1-20260730`.
6. Espera a que termine la publicación y recarga la página con Ctrl+F5.

## Diagnóstico

Si la web sigue mostrando v8.1, GitHub Pages está publicando otra rama, la carpeta `/docs`, o un `index.html` antiguo que continúa en la raíz configurada.

Los parámetros `?v=10.0.1-20260730` añadidos a CSS y JavaScript fuerzan al navegador a solicitar los archivos nuevos.
