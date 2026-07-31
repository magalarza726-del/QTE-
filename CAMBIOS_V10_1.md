# Cambios v10.1 — Balance Studio

## Balance de Emblemas

| Emblema | Cambio |
|---|---|
| Sombra | La carta adicional perfecta funciona al 65 % de potencia. |
| Asesino | Daño x1,35. Autodaño gradual: 8 % del daño perfecto por error, con límite de 25 % de vida por turno. |
| Curandero | Cura 15 % del daño efectivo, con límite de 15 % de vida por turno. |
| Tempo | Tiempo x1,65 y daño x0,75. |
| Escudero | Reduce 18 % del daño recibido. |
| Caos | Daño x1,65 en lugar de x3. Mantiene el remapeo de dos secciones. |
| Venganza | Bonificación de 20 % con vida inferior a 35 %. |
| Espejo | Sin cambio mecánico. |

## Límites globales

- Daño máximo por carta: 38 % de la vida máxima.
- Daño máximo combinado por turno: 58 %.
- Autodaño máximo por turno: 25 %.
- Curación máxima por turno: 15 %.
- Un jugador con vida completa no puede morir en una sola interacción, incluso combinando daño rival y autodaño.

## Animaciones

- 30 técnicas base en total.
- 15 técnicas nuevas y visualmente distintas.
- Multiplicador de duración de combate: 2,15 frente a v10.0.
- Secuencias de hasta 16 pasos.
- Presets personalizados persistentes.
- Cada paso guarda técnica, velocidad, duración, impactos y pausa.

## Música

- 10 pistas procedurales incluidas.
- Hasta 20 pistas importadas por el usuario.
- Selección aleatoria por combate.
- Se evita repetir la pista anterior cuando existe otra opción.
- Persistencia mediante IndexedDB y respaldo completo.

## Compatibilidad

- Conserva la clave de almacenamiento de v8 para migrar el progreso existente.
- Las cartas antiguas se convierten automáticamente al esquema de animación individual.
- Los audios antiguos se incorporan a la nueva biblioteca musical.
