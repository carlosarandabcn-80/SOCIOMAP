# Consultoría funcional de SOCIOMAP

**10 de noviembre de 2026 · Intervención socioeducativa**

La revisión cubre la aplicación de sociograma que abre Social Pro Tools. Se contrastó la web publicada con el código de SOCIOMAP y se recorrieron las seis pantallas con datos ficticios. La versión de partida del repositorio era `3edfd51`.

[Aplicación SOCIOMAP](https://carlosarandabcn-80.github.io/SOCIOMAP/)

## Hallazgos y resolución

| Área | Hallazgo | Cambio aplicado |
| --- | --- | --- |
| Alta y continuidad | Si ya había respuestas, la configuración enviada desde la pantalla de acceso podía descartarse. | El registro recupera el estudio activo. Si llega otra configuración, permite revisarla y exige confirmar la sustitución. |
| Identidad de participantes | Los nombres se editaban en bloque. Corregir uno desde la configuración podía obligar a crear otro estudio. | La ficha admite nombre o alias opcional. Un campo vacío recupera el código. Cambiarlo conserva el identificador, las respuestas, la foto y la posición. Se mantienen las comprobaciones de duplicados. |
| Fotografías | La foto ya era opcional. Una carga lenta podía reemplazar otra seleccionada después o reaparecer tras retirar el retrato. | Se comprueba la firma de JPG, PNG y WebP, el tamaño y la capacidad de decodificar la imagen. La miniatura se recorta y genera localmente, sin los metadatos originales. Una carga anterior no puede reemplazar a la última ni escribirse en otro estudio. |
| Registro y validación | Un fallo al guardar podía quedar oculto por un mensaje de éxito. Un archivo podía superar el máximo de votos por signo en un borrador. | La edición solo se confirma al guardar. Si falla, se conserva la respuesta anterior y se indica el error. Los borradores admiten cuotas incompletas sin exceder el máximo. El enlace directo al mapa comprueba también que todas las respuestas estén completas. |
| Recuperación y seguimiento | El formulario podía descargar un respaldo longitudinal, pero carecía de un flujo para restaurarlo y continuar trabajando. | «Copias y mediciones» descarga y restaura JSON compatibles, incluidos borradores. Comprueba el archivo antes de sustituir el estudio activo. Al crear otra medición, la fecha debe ser posterior y se mantienen las identidades y los retratos con las respuestas vacías. |
| Cálculo sociométrico | Las fórmulas y los límites de interpretación eran consistentes. La presentación de los empates y de la escala de barras variaba entre vistas. | Tablas y barras se ordenan por positivas recibidas, con el orden de registro para los empates. El informe usa la misma escala en todas sus páginas. Se conserva el cálculo por destinatario y por signo. |
| Mapa y demo | Los grupos compactos quedaban pequeños en el lienzo. La demo superponía las flechas de sentidos opuestos y algunas acciones de teclado desincronizaban el resaltado y la selección. | El mapa y las exportaciones encuadran el grupo. La demo separa las flechas de doble sentido y ofrece un filtro de positivas recíprocas. El foco y la selección se sincronizan con la ficha y las barras. |
| Privacidad y exportación | Una vista identificada podía reaparecer al recargar. Autorizar los nombres en una exportación incluía automáticamente los retratos. | Cada apertura muestra códigos y oculta las fotos. Nombres y retratos se autorizan con casillas separadas. CSV conserva solo texto y elecciones. Los respaldos privados de recuperación sí conservan la identidad. |
| Diseño y accesibilidad | Dos hojas de estilo duplicaban el diseño. La animación inicial retrasaba el acceso y podía quedar fija con el ajuste de movimiento reducido. | Una hoja de estilo unifica las seis pantallas. Se elimina la pantalla de entrada superpuesta. Se usan azul UNIR `#0098CD`, carbón `#333333` y blanco, con azul oscuro `#006C8F` para texto y botones de mayor contraste. Se conserva la marca de SOCIOMAP. |

[Colores corporativos de UNIR](https://cuidadores.unir.net/images/pdf/comercial/Colores-Corporativos.pdf)

## Criterios del análisis

- El formulario público mantiene **7 a 40 personas y 3 elecciones positivas y 3 negativas distintas por participante**. Se excluye la autoelección. Con siete personas, la cuota obliga a clasificar a todas las demás.
- Los recuentos se obtienen por columna. La entrada relativa usa posibles emisores que respondieron, excluyendo la respuesta propia. La reciprocidad se calcula por signo y la intermediación solo usa caminos dirigidos de elecciones positivas. Los grupos recíprocos se describen como componentes conectados por cadenas.
- Con el grupo completo y una cuota exacta, la densidad positiva es la cuota dividida por el número de posibles destinatarios de cada persona. Sirve para describir la medición. Un cambio de cohesión requiere evidencia adicional.
- La comparación exige la misma cohorte, los mismos identificadores, la misma pregunta, reglas compatibles, una fecha anterior conocida y ambas mediciones completas. Los resultados son descriptivos y deben interpretarse junto con el contexto del grupo.

[Reciprocidad en NetworkX](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.reciprocity.reciprocity.html) · [Intermediación en NetworkX](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.centrality.betweenness_centrality.html)

## Verificación

- Pruebas de cálculo, migración de estudios anteriores, límites de voto, duplicados, validación de archivos y recuperación ante fallos de almacenamiento.
- Recorrido en Chromium desde la portada hasta la comparación longitudinal. Incluye captura, edición, retirada de fotos, respaldo y restauración de un borrador, filtros del mapa y las cinco descargas. Se comprueba el contenido de los archivos y la separación de las dos opciones de exportación.
- Comprobación de las seis páginas con axe-core y de la interfaz con datos a 390 px. Se verifica también el mapa identificado a 320 px con un nombre largo. El análisis automático cubre solo los criterios que la herramienta puede comprobar.

## Límites de uso y de la revisión

El estudio y sus fotos se guardan en la sesión de la pestaña o, si se elige «Recordar», en el perfil del navegador. SOCIOMAP no añade cifrado ni sincronización entre dispositivos. Los códigos reducen la exposición de nombres y fotos. La pregunta, la fecha, las relaciones y las copias privadas requieren custodia por su capacidad de identificar al grupo.

La revisión se realizó en Chromium con datos ficticios. Quedan fuera las pruebas manuales con lectores de pantalla, la validación en otros motores de navegador, la conformidad PDF/UA y la validación psicométrica del cuestionario. La plantilla conserva dos papeletas por hoja A4 y los resultados requieren interpretación profesional.
