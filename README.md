# QTE Lab v10.1 — Balance Studio

Juego web estático de construcción de mazos, Emblemas y combate QTE, compatible con GitHub Pages.

## Novedades principales

- Rebalance completo de los ocho Emblemas.
- Límite de daño de 38 % de vida por carta y 58 % por turno.
- Autodaño de Asesino limitado al 25 % de vida por turno.
- Curación limitada al 15 % de vida por turno.
- La carta adicional de Sombra se ejecuta al 65 % de potencia.
- Biblioteca ampliada de 15 a 30 animaciones procedurales.
- Animaciones de combate con duración 2,15 veces superior a v10.0.
- Creador de animaciones personalizadas desde la app.
- Secuenciador de hasta 16 técnicas por carta.
- Biblioteca de 10 pistas musicales procedurales integradas.
- Hasta 20 pistas propias almacenadas en IndexedDB.
- Selección musical aleatoria sin repetir la pista anterior cuando hay alternativas.

## Animaciones nuevas

Además de las 15 técnicas originales, se añadieron:

- Codazo
- Rodillazo
- Patada voladora
- Doble corte
- Estocada
- Bumerán energético
- Rayo láser
- Onda de choque
- Golpe al suelo
- Patada con voltereta
- Embestida
- Caída meteórica
- Torbellino
- Ráfaga de disparos
- Corte de energía

## Creador y secuenciador

Cada carta puede usar:

- Una técnica individual personalizada.
- Una secuencia final de hasta 16 pasos.
- Parámetros independientes por paso: técnica, velocidad, duración, impactos y pausa.
- Parámetros generales de distancia, salto, efecto, estela, cámara y sonido.
- Presets personalizados guardados dentro del navegador.

Ejemplo:

```text
Dash → Uppercut → Explosión
```

## Música

La app incluye diez pistas procedurales generadas mediante Web Audio. También admite hasta veinte audios propios. En modo aleatorio, cada combate intenta reproducir una pista distinta de la anterior.

## Funciones conservadas

- 100 cartas iniciales editables.
- Decks de 12 cartas.
- Ocho Emblemas y encantamientos aleatorios.
- Poder Bruto, Poder Neto y coeficiente de diversidad.
- Estadísticas persistentes por carta.
- Imagen individual por carta.
- Fondo de batalla en imagen o video.
- Exportación e importación de respaldos.
- Escritorio, móvil vertical y móvil horizontal.
- Entradas TAP; no existe mecánica HOLD.

## Publicación en GitHub Pages

Sube el contenido interno de esta carpeta a la raíz de la rama `main`. `index.html` debe quedar directamente en la raíz.

En GitHub:

1. Abre **Settings**.
2. Entra en **Pages**.
3. Selecciona **Deploy from a branch**.
4. Escoge `main` y `/ (root)`.

## Orden de carga

```text
index.html
  ├── data.js
  ├── animation/animation-registry.js
  ├── particles/particle-pool.js
  ├── camera/camera-controller.js
  ├── characters/stickman.js
  ├── effects/effect-system.js
  ├── audio/music-system.js
  ├── game-systems.js
  ├── emblem-system.js
  ├── emblems/visual-emblems.js
  ├── combat/balance-system.js
  ├── combat/combat-visuals.js
  └── main.js
```

Consulta `CAMBIOS_V10_1.md`, `ARQUITECTURA_V10_1.md` y `PRUEBAS_V10_1.md`.
