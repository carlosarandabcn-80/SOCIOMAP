# SOCIOMAP 2: cierre de las seis fases

Fecha: 21 de octubre de 2026. Trabajo realizado sobre `c9d270e`, que contenía la fase 1 pendiente de integración. La instrucción del propietario autoriza terminar las mejoras y actualizar GitHub.

## Alcance implementado

| Fase | Resultado |
| --- | --- |
| 1. Integridad del núcleo | Se conserva la corrección por destinatario, la matriz única y la validación; formulario, tablas, barras, sociograma y mapa de calor comparten los mismos datos. Editar invalida los resultados de la pantalla anterior. |
| 2. Seguridad y privacidad | Presentación con `textContent` y elementos del DOM, validación en todas las lecturas/importaciones, límites de tamaño, CSP y ausencia de CDN. Sesión temporal, persistencia voluntaria, borrado explícito, seudónimos y exportaciones identificadas solo si se elige. |
| 3. Metodología | Se eliminan los roles automáticos. Pregunta, fecha, cuotas exactas/máximas y negativas opcionales; entre 2 y 40 participantes. Se distinguen respuestas pendientes y ceros. Denominadores y límites documentados, incluidos los de densidad con cuota fija. |
| 4. Interacción y accesibilidad | Navegación entre todas las vistas, búsqueda, selección, detalle, filtros, disposiciones, arrastre y teclado, fijación de posiciones, deshacer, zoom, contraste y trazos además del color. Tablas equivalentes y contenedores desplazables en móvil. |
| 5. Exportación y persistencia | PNG y SVG con grupo, fecha, leyenda y filtro; PDF con fuentes incorporadas, mapa, barras, tabla y criterios; copias CSV/JSON, registro explícito por fila en CSV, importación verificada y posiciones recuperables. Mapa de calor conectado y enlace de vuelta corregido. |
| 6. Análisis relacional | Entrada positiva relativa, reciprocidad por signo, densidad general y observada, intermediación positiva dirigida, componentes exploratorios y comparación entre fechas compatibles con identidades estables. |

## Primera revisión: contrato y cálculos

Se revisaron dimensiones, autovotos, emisor/destinatario, conservación de elecciones, normalización de nombres, cuotas y ausencia de respuesta. Se contrastaron casos con resultado conocido: matriz asimétrica de siete personas, cadena dirigida de tres, diamante con dos caminos mínimos, elecciones mutuas y componentes conectados sin exigir clique.

Se comprobó que la comparación empareja por identificadores y admite reordenar la matriz; bloquea cohortes, preguntas, reglas, coberturas y fechas incompatibles. Se migran proyectos de la fase 1 sin inventar una fecha histórica. Los formatos antiguos de nodos/aristas sin matriz siguen rechazándose.

## Segunda revisión: recorridos, estados y resultados exportados

Se ejecutaron **21 pruebas de lógica y recursos** y **11 grupos de pruebas en navegador**, todos superados. El recorrido de navegador se repitió tras corregir los problemas encontrados: selección de opciones, referencia de estado al editar una fila y tipografía del PDF. La ejecución en GitHub detectó además una comprobación de importación que consultaba la pantalla antes de finalizar la lectura: la prueba ahora espera el final observable de la operación. Se añadió resolución de colisiones en las disposiciones del grafo y se volvió a ejecutar la suite completa.

Los once grupos cubren:

1. Inicio y demostración ficticia, sin recursos externos.
2. Alta de grupo, captura de 42 elecciones asimétricas, recarga, ranking y destinatarios correctos del grafo.
3. Filtros, búsqueda, teclado, posiciones fijadas, deshacer y recuperación de posiciones.
4. Descargas reales PNG, SVG, PDF, JSON y CSV; seudónimos por defecto y nombres originales solo por elección.
5. Mapa de calor, invalidación al editar y análisis parcial con aceptación expresa, también después de recargar.
6. Nueva medición, conservación de identificadores y comparación compatible/incompatible.
7. Sesión temporal, persistencia voluntaria, recuperación en otra pestaña y borrado.
8. Importación incorrecta, almacenamiento JSON corrupto y nombres que contienen HTML, presentados como texto.
9. Nombres duplicados y almacenamiento bloqueado, sin destruir la matriz en memoria.
10. Las cinco páginas a 390 px, con datos en el grafo y la matriz, sin desbordamiento horizontal del documento.
11. Grupo de 40 personas: 1.560 selectores, 240 relaciones, arrastre y deshacer, importación CSV e informe PDF de ocho páginas con nombres latinos, griegos y cirílicos.

La suite exige cero excepciones JavaScript, cero errores de consola y cero solicitudes de la aplicación a otros orígenes. Las referencias de documentación solo se abren si la persona pulsa sus enlaces.

Los PDF se renderizaron con Poppler. Se revisaron páginas, tipografía, márgenes, tabla y gráficos. Se verificó la incorporación de DejaVu Sans y la conservación de texto Unicode al extraer el informe de 40 personas. PNG y SVG incluyen la información de la vista y utilizan recursos incorporados. Las capturas y descargas de prueba usan exclusivamente datos ficticios y no se incluyen en el repositorio.

## Reproducción

```sh
npm ci --ignore-scripts
npm test
npx playwright install --with-deps chromium
npm run test:browser
```

Node.js 22 o posterior. Para un Chromium ya instalado se admite `CHROMIUM_EXECUTABLE_PATH`; `QA_DIR` selecciona el directorio de capturas y descargas. La suite inicia y cierra su servidor. En esta revisión se utilizó Playwright 1.62.1 con Chromium sin interfaz. Se incluye un flujo de GitHub Actions para repetir las comprobaciones.

## Límites prácticos

- Se mantiene una arquitectura estática: no hay cuentas, servidor de análisis ni sincronización entre dispositivos.
- El navegador puede bloquear o perder su almacenamiento; una descarga JSON es la copia de continuidad. Algunos navegadores restauran sesiones cerradas; el borrado explícito es necesario en equipos compartidos.
- Los CSV admitidos son los exportados por SOCIOMAP, conservando configuración y cabeceras. La primera fila permite validar pregunta, reglas e identidades en lugar de inferirlas.
- La comparación necesita el mismo estudio y respuestas completas. No infiere impacto causal ni significación estadística.
- La revisión no es una certificación WCAG, una auditoría formal de seguridad ni una validación psicométrica. El PDF conserva texto seleccionable, pero no es un PDF etiquetado; las tablas HTML ofrecen una alternativa accesible.
- Los nombres con glifos fuera de las fuentes incorporadas se dibujan con una alternativa gráfica, dependiendo de las fuentes del navegador. No se garantiza cobertura universal de escrituras.

El respaldo metodológico y sus límites están en [METODOLOGIA.md](METODOLOGIA.md); la aplicación muestra también una guía comprensible para quien registra o interpreta los datos.
