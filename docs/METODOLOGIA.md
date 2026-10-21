# Criterios de análisis de SOCIOMAP 2

Revisión: 21 de octubre de 2026. Definiciones operativas del programa; no constituyen una validación psicométrica del instrumento.

## Matriz y unidades

`matriz[i][j]` recoge la elección dirigida de i hacia j: `"+"`, `"-"` o `"0"` en respuestas registradas. Las filas pendientes contienen `null` fuera de la diagonal; la diagonal es siempre `"0"`. El cero expresa ausencia de elección en una respuesta registrada; no demuestra ausencia de vínculo social. La elección negativa se refiere a la pregunta concreta, no a un diagnóstico de rechazo personal.

N es el número de participantes, R las respuestas registradas, L+ las elecciones positivas dirigidas y M+ los pares con positiva en ambos sentidos. Las negativas se calculan por separado. Una pareja puede tener signos opuestos en los dos sentidos: no se considera recíproca del mismo signo.

## Indicadores

| Indicador | Operación | Límite de interpretación |
| --- | --- | --- |
| Positivos/negativos recibidos | Suma de cada signo por columna | Recuento contextual, sin umbrales de roles |
| Entrada positiva relativa | Positivos recibidos / [R − respuesta propia registrada] | `null` si el denominador es cero; no es una puntuación tipificada |
| Reciprocidad positiva | 2M+ / L+ | Indefinida si L+ = 0; no se sustituye por cero |
| Densidad positiva | L+ / [N(N − 1)] | Las filas pendientes reducen lo observado; no se imputan como ceros |
| Densidad sobre respuestas observadas | L+ / [R(N − 1)] | Describe solo las filas registradas, sin corregir sesgo de ausencia |
| Intermediación | Suma de fracciones de caminos mínimos dirigidos positivos que pasan por el nodo, excluyendo extremos; división por (N − 1)(N − 2) | Algoritmo de Brandes; pares sin camino no aportan; N = 2 produce 0 por convención |
| Componentes positivos | Conexión débil de elecciones positivas, sin exigir reciprocidad | Incluye componentes unitarios; no equivale a subgrupos cohesivos |
| Componentes recíprocos exploratorios | Componentes del grafo no dirigido de positivas mutuas; se muestran solo los de tamaño ≥ 2 | Conexión por cadenas, no clique ni detección validada de comunidades |

Si cada respuesta completa exige k elecciones positivas y responden todos, L+ = Nk y la densidad = k/(N − 1). Con N y k constantes, este indicador no puede variar: interpretarlo como prueba de cohesión o de mejora sería incorrecto. La reciprocidad puede cambiar, pero tampoco acredita por sí sola un cambio socioeducativo.

La intermediación se obtiene solo en el grafo positivo; no se aplican distancias negativas ni se mezclan signos. Las personas sin respuesta pueden recibir elecciones, pero sus relaciones salientes son desconocidas: el análisis parcial es provisional.

## Comparación longitudinal

La comparación exige una misma cohorte, conjunto idéntico de identificadores estables, pregunta y límites de elección equivalentes, respuestas completas en ambas matrices y fecha anterior registrada. El orden de las filas puede cambiar: las identidades se emparejan por identificador, no por posición ni por nombre.

Se muestran elecciones positivas nuevas y desaparecidas, cambios de signo, variación de pares y proporciones, y diferencias de recuentos e intermediación por participante. Las diferencias de proporciones se expresan en **puntos porcentuales**. No se calculan significación estadística, causalidad ni impacto de un programa.

Los proyectos v1 se migran con la fecha marcada como **no registrada** y el criterio como desconocido. No se inventa una fecha histórica. Es necesario revisar esos campos antes de comparar.

## Uso socioeducativo

No se asignan automáticamente roles personales. Cero positivos no implica aislamiento; muchas elecciones negativas no determinan por sí solas una identidad de «rechazado». La interpretación requiere conocer el grupo, la pregunta, la recogida y las ausencias, y contrastar con escucha, observación y otras técnicas. Protege la confidencialidad y evita mostrar elecciones individuales ante el grupo sin una justificación profesional y un procedimiento adecuado.

## Referencias primarias consultadas

NetworkX Developers. (s. f.). *reciprocity*. Documentación oficial de NetworkX. https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.reciprocity.reciprocity.html

NetworkX Developers. (s. f.). *betweenness_centrality*. Documentación oficial de NetworkX. https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.centrality.betweenness_centrality.html

NetworkX Developers. (s. f.). *connected_components*. Documentación oficial de NetworkX. https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.components.connected_components.html

Consultadas el 21 de octubre de 2026. Estas referencias respaldan las definiciones de grafos; no validan la interpretación social ni el instrumento de recogida de SOCIOMAP.
