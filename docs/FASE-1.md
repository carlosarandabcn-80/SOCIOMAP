# Fase 1: integridad de los votos y conexión del sociograma

Fecha: 19 de octubre de 2026. Base revisada: `313eab1`.
Rama: `codex/fase-1-integridad-sociometrica`.

## Cambios

- Se sustituye el índice de la lista de selectores (que omitía la diagonal y desplazaba los destinatarios) por coordenadas explícitas de emisor y destinatario.
- `sociometria.js` valida una matriz completa y calcula los votos recibidos por columna. Formulario, barras y sociograma comparten ese cálculo.
- Se guardan grupo, nombres y matriz en una sola escritura de `localStorage`, bajo `sociogramaData`, antes de navegar. El lector vuelve a validar todo antes de construir nodos y vínculos.
- Se rechazan grupos fuera de 7–40 participantes, nombres vacíos o duplicados, matrices incompletas, valores distintos de `0`, `+`, `-`, votos a uno mismo y filas sin exactamente tres positivos y tres negativos.
- Los nombres se normalizan con Unicode NFC, espacios y mayúsculas para detectar duplicados. Los caracteres con significado HTML se muestran como texto. Los vínculos usan índices, no nombres como claves.
- Editar votos destruye el gráfico anterior, vacía el ranking, oculta el botón del sociograma y elimina los datos guardados. Recrear o cambiar la configuración del grupo también elimina la tabla anterior y deshabilita el ranking. Volver atrás invalida los resultados restaurados por el navegador.
- Los errores de almacenamiento impiden navegar. Los datos ausentes, corruptos o antiguos muestran un mensaje y un enlace de vuelta; la falta de D3 también muestra recuperación. Si falla Chart.js, permanece disponible el ranking.

## Contrato de datos

```json
{"version":1,"grupo":"Nombre del grupo","nombres":["..."],"matriz":[["0","+","..."]]}
```

`matriz[i][j]` es el voto de la persona i hacia la persona j. La diagonal es `0`; los neutros son `0` explícitos. Cada fila y la matriz tienen la misma dimensión que la lista de nombres. No se guardan resultados derivados que puedan desincronizarse.

El formato antiguo `{nodes, links}` se rechaza deliberadamente: no permite comprobar la matriz original completa. Se solicita regenerar el ranking. Las dos páginas deben servirse desde el mismo origen HTTP(S); no se garantiza almacenamiento compartido bajo `file://`.

## Primera revisión

Revisión del flujo original, coordenadas y contrato compartido. Se comprobó manualmente una matriz asimétrica de siete participantes:

| Participante | Positivos recibidos | Negativos recibidos |
| --- | ---: | ---: |
| P1 | 6 | 0 |
| P2 | 6 | 0 |
| P3 | 6 | 0 |
| P4 | 3 | 3 |
| P5 | 0 | 6 |
| P6 | 0 | 6 |
| P7 | 0 | 6 |

Resultado: 21 positivos, 21 negativos y 42 vínculos, sin autovotos. Cinco pruebas automatizadas de lógica superadas, incluyendo conservación de votos con 7, 8 y 40 participantes y rechazo de dimensiones/celdas inválidas.

La primera ejecución funcional en el entorno restringido no pudo cargar Chart.js. Se repitió con acceso de red a las dependencias reales y pasó el recorrido formulario → ranking/barras → sociograma → recarga, además de edición, recreación y errores de datos/almacenamiento.

## Segunda revisión

Revisión de limpieza de estado, acceso directo, lectura de JSON y presentación de nombres. Se añadieron mensajes de recuperación ante ausencia de D3 y limpieza de mensajes de validación obsoletos al editar. Se verificó que ambos bloques CSS permanecen idénticos a la base y que no se han cambiado las reglas de roles ni los parámetros visuales de D3.

La suite funcional usa Edge sin interfaz mediante Playwright, con Chart.js y D3 reales. Comprueba datos del gráfico de barras, los 42 pares emisor/destinatario del SVG, persistencia al recargar, resultados invalidados al editar/recrear/cambiar grupo, duplicados, nombres vacíos, eliminación de una celda, JSON corrupto, formato antiguo, nombres especiales en tooltip, D3 bloqueado y fallo de escritura del almacenamiento. Se exige ausencia de excepciones JavaScript no controladas.

Resultado final: cinco pruebas de lógica superadas y siete grupos de comprobaciones funcionales superados, con cero excepciones no controladas. La suite funcional se repitió después del último ajuste de mensajes y volvió a pasar.

## Reproducir las pruebas

Se utilizó Node.js 24.19.0 y Playwright 1.62.1, con Microsoft Edge instalado.

```sh
node --test tests/sociometria.test.cjs
# Con Playwright disponible en la resolución de módulos:
node tests/funcional.cjs
```

La suite funcional inicia y cierra su propio servidor en localhost. Usa Chromium por defecto; para Edge establece `BROWSER_CHANNEL=msedge`. Necesita acceso a los CDN actuales del sitio. Playwright es una herramienta de pruebas y no una dependencia de la aplicación.

## Alcance y límites

Solo Fase 1. No se modifica el diseño, la clasificación sociométrica, la disposición del grafo, el mapa de calor, las exportaciones ni otras fases de la auditoría. La comprobación de estilo es una comparación del CSS, no una certificación visual de todos los dispositivos. Las dependencias externas existentes continúan siendo necesarias. Los datos se conservan localmente en el navegador; no se añade un servidor ni sincronización entre dispositivos.

No se fusiona la rama a `main` ni se publica un despliegue.
