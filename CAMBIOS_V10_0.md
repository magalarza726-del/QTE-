# QTE Lab v10.0 — Animaciones, efectos y personajes procedurales

## Combate visual

- El QTE desaparece automáticamente al finalizar.
- La animación comienza inmediatamente, sin confirmación intermedia.
- Después se reproduce el contraataque rival y aparece el resultado.
- El HUD de animación muestra carta, Emblema, precisión y Poder Neto.

## Técnicas disponibles

1. Golpe recto
2. Dash
3. Patada
4. Uppercut
5. Giro
6. Espadazo
7. Disparo
8. Explosión
9. Carga
10. Salto
11. Combo
12. Martillazo
13. Teletransporte
14. Barrido
15. Agarre

Las cartas solo guardan el identificador de la técnica y sus parámetros. Varias cartas pueden reutilizar una misma animación.

## Editor

Nueva pestaña **Animación** con:

- tipo;
- velocidad;
- distancia;
- impactos;
- duración;
- altura del salto;
- tamaño del efecto;
- longitud de estela;
- sacudida de cámara;
- sonido procedural;
- Emblema y precisión de prueba;
- botón **Previsualizar**.

## Precisión visual

- Menos de 20 %: rojo, lento y débil.
- 20–39 %: naranja.
- 40–59 %: amarillo.
- 60–79 %: verde.
- 80–89 %: turquesa.
- 90–100 %: celeste, mayor brillo, estela, partículas e impacto.

## Emblemas visuales

- Sombra: manos y pies morado oscuro, además de réplicas residuales.
- Asesino: rojo intenso.
- Curandero: verde y partículas ascendentes.
- Tempo: azul y estela azul.
- Escudero: gris metálico y escudo breve.
- Caos: colores variables y destellos multicolor.
- Venganza: rojo oscuro y aura pulsante cuando está activa.
- Espejo: blanco plateado y brillo suave.

## Rendimiento

- Pool de 280 partículas reutilizables.
- Pool de 130 puntos de estela.
- Gradientes de escenario almacenados al redimensionar, no recreados cada cuadro.
- Animación mediante `requestAnimationFrame`.
- Lienzo limitado a un DPR máximo de 2.

## Compatibilidad

Se conservan los datos v8 y v9. Las cartas antiguas reciben una configuración de animación automática al migrarse.
