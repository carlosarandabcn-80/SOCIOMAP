# SOCIOMAP

Herramienta web de análisis sociométrico descriptivo para la intervención socioeducativa. Autoría: **Carlos Aranda · ARANDA TOOLS**.

[Sitio web](https://carlosarandabcn-80.github.io/SOCIOMAP/) · [Guía de uso y criterios](instrucciones.html) · [Cambios y validación](docs/MEJORAS-COMPLETAS.md)

## Funciones

- Una matriz dirigida compartida por formulario, tabla, barras, sociograma . Cálculo por destinatario, sin autovotos ni estados de resultados obsoletos.
- **Interfaz pública:** entre 7 y 40 participantes, con cuota exacta inalterada de **3 positivas y 3 negativas** por participante. **Núcleo interno:** admite de 2 a 40 y cuotas máximas u opcionales; estas modalidades no son configurables desde el formulario actual.
- Distinción entre respuestas pendientes (`null`) y personas no elegidas (`"0"`). El motor distingue ambas situaciones, pero el formulario actual requiere seis elecciones completas por persona para calcular resultados.
- Elecciones positivas y negativas recibidas, entrada positiva relativa, reciprocidad por signo, densidad, intermediación dirigida positiva y componentes exploratorios de elecciones positivas recíprocas. Sin clasificación automática de personas como «líder», «rechazada» o «aislada».
- Búsqueda, selección y detalle de conexiones; filtros por signo o positivas recíprocas; disposición automática, circular o en rejilla; arrastre, teclado, posiciones fijadas, deshacer y controles de zoom.
- Tablas equivalentes al grafo, símbolos y trazos además del color, foco visible y tablas desplazables en pantallas pequeñas.
- Recuperación de borradores y posiciones; sesión temporal por defecto; persistencia local optativa; borrado explícito.
- Exportación real a PNG, SVG, PDF, JSON y CSV, con seudónimos por defecto. El PDF incluye mapa, barras, tabla e información metodológica.
- Comparación de dos fechas del mismo estudio, con identidades estables y comprobación de compatibilidad.

## Uso local y publicación

Es un sitio estático. No necesita compilación, registro, base de datos ni CDN. Las páginas, fuentes del sistema y scripts se sirven desde el mismo origen. `pdf-lib`, `@pdf-lib/fontkit` y las fuentes DejaVu se distribuyen localmente y se cargan solo al exportar PDF.

```sh
python -m http.server 8000
```

Abre `http://localhost:8000/`. También puede servirse desde GitHub Pages, en la raíz del repositorio. No se admite `file://`: el almacenamiento y la carga de recursos necesitan un origen HTTP(S).

1. Configura grupo, fecha, pregunta, participantes y reglas. La plantilla PDF original corresponde exclusivamente a **3 + y 3 −**, con al menos siete participantes.
2. Crea la matriz, marca cada respuesta registrada y transcribe las elecciones. Una fila pendiente no cuenta como una respuesta de ceros.
3. Calcula resultados y abre el sociograma.
4. Para realizar otra medición, completa primero todas las respuestas, cambia la fecha por otra posterior y pulsa «Guardar medición actual e iniciar otra fecha». La aplicación descarga automáticamente una copia JSON identificable de la medición anterior antes de sustituirla; **verifica la descarga y conserva el archivo en un lugar seguro**. Se mantienen códigos, participantes y pregunta, pero todas las elecciones de la nueva fecha quedan pendientes. El botón «Crear grupo» bloquea la reutilización silenciosa de votos con otra fecha.
5. Carga la copia anterior en la comparación. Se exigen mismo estudio, participantes, pregunta y reglas, ambas recogidas completas y una fecha anterior registrada.

`demo.json` contiene el mismo caso ficticio 3+3 que la demostración pública; `tabla.csv` es un archivo ilustrativo antiguo que puede usar reglas diferentes. La versión simplificada del formulario no incorpora importación de archivos. El importador del núcleo se utiliza al cargar una medición anterior para su comparación; los archivos CSV arbitrarios no se aceptan. La función interna `Sociometria.demo()` (2+/1−) sigue disponible solo como fixture de pruebas históricas; la demostración pública utiliza exclusivamente `Sociometria.demoPublica()` (3+/3−). El CSV es una matriz con configuración en su primera fila y cabeceras en la segunda. Conserva ambas y utiliza la última columna, «Respuesta registrada»: 1 para una respuesta registrada y 0 para una pendiente. En una fila registrada, completa todas las celdas con +, - o 0; deja vacías las elecciones de una fila pendiente. No se admiten matrices genéricas sin reglas ni identidades. Las copias JSON incluyen también la vista y las posiciones.

## Datos y privacidad

Los datos se procesan en el navegador y no se envían a un servidor de análisis. El servidor de alojamiento recibe las solicitudes normales de los archivos del sitio. No se incorporan analítica, llamadas a IA ni recursos externos durante el uso de la aplicación.

Por defecto se usa `sessionStorage` de la pestaña. Algunos navegadores restauran sesiones cerradas. La opción «Recordar» utiliza `localStorage` hasta el borrado. Este almacenamiento **no está cifrado por la aplicación**; no equivale a una cuenta privada ni a una copia de seguridad. Utiliza códigos y guarda las identidades por separado. En equipos compartidos, termina con «Borrar datos»: se elimina el estudio y la configuración transitoria de acceso tanto de sesión como persistente. Las preferencias generales de accesibilidad no se borran automáticamente.

Los archivos descargados no se eliminan con ese botón. Seudonimizar no garantiza anonimato: los patrones relacionales y el contexto pueden permitir reidentificar personas. No subas datos reales al repositorio público. Las exportaciones solo incluyen nombres y grupo originales si se marca expresamente esa opción.

## Criterios y límites

El análisis es contextual y descriptivo, no diagnóstico. La densidad con cuota exacta k y respuesta completa es k/(N − 1): no permite evaluar por sí sola cambios de cohesión. Los componentes recíprocos no son comunidades validadas. Una diferencia entre fechas no prueba el efecto de una intervención.

Fórmulas y referencias primarias: [guía metodológica](docs/METODOLOGIA.md). El documento de la [fase 1](docs/FASE-1.md) se conserva como registro histórico; su almacenamiento y sus límites originales han sido sustituidos por la versión 2.

## Pruebas

Node.js 22 o posterior; Playwright está fijado como dependencia de desarrollo. La aplicación no lo necesita en producción.

```sh
npm ci --ignore-scripts
npm test
npx playwright install --with-deps chromium
npm run test:browser
```

La suite de navegador inicia y cierra su propio servidor local y exige cero peticiones a otros orígenes y cero errores JavaScript o de consola. Comprueba recorridos de datos, edición, exportaciones, guardado, comparación y adaptación a 390 px. Los resultados no equivalen a una certificación formal de accesibilidad ni a una auditoría de todos los navegadores.

Se puede indicar un navegador ya instalado con `CHROMIUM_EXECUTABLE_PATH` o un canal con `BROWSER_CHANNEL`. `QA_DIR` permite guardar capturas y archivos generados fuera del repositorio. GitHub Actions ejecuta pruebas unitarias, recorridos de navegador y una revisión automática con axe-core en `main`, `codex/**`, `fix/**` y solicitudes de integración.

## Archivos principales

| Archivo | Responsabilidad |
| --- | --- |
| `sociometria.js` | Contrato v2, validación, migración v1, cálculos, comparación e intercambio CSV/JSON |
| `almacenamiento.js` | Sesión, persistencia optativa y borrado |
| `ui.js`, `estilos.css` | Elementos seguros del DOM, presentación y accesibilidad |
| `formulario.js` | Configuración, captura de respuestas y resultados |
| `graficos.js` | Disposiciones y representaciones SVG, tablas  |
| `sociograma.js` | Interacción de las vistas |
| `exportaciones.js` | PNG, SVG e informe PDF |
| `vendor/` | Generación PDF, motor tipográfico, fuentes y sus avisos de licencia |
| `tests/` | Regresión de cálculo, contrato, recursos y recorridos en navegador |

## Autoría y uso

© 2026 Carlos Aranda · ARANDA TOOLS. Se conserva el régimen de uso indicado originalmente: uso educativo o interno; contactar con el autor para otros usos. `pdf-lib` conserva su licencia MIT en `vendor/pdf-lib.LICENSE.md`; el README y los metadatos originales de `@pdf-lib/fontkit` identifican su licencia MIT y autoría. Las fuentes DejaVu conservan su aviso en `vendor/DejaVu-LICENSE.txt`.

## Estado y documentación de auditoría

El informe `docs/AUDITORIA-INTEGRAL-2026-10-24.md` se conserva como registro histórico de una propuesta de mejora anterior. Los cambios y verificaciones vigentes se describen en `docs/AUDITORIA-CORRECTIVA-2026-10-31.md`. La demostración pública es ficticia y no modifica el almacenamiento del estudio actual. SOCIOMAP realiza análisis descriptivos sin atribuir diagnósticos personales.

## Auditoría correctiva · 31 de octubre de 2026

- Se ha incorporado el ciclo longitudinal explícito: copia de seguridad JSON, validación estricta de fecha posterior, conservación de identificadores y vaciado íntegro de la matriz de la nueva medición. El formulario ya no permite asignar otra fecha a los votos anteriores.
- La opción de almacenamiento persistente se conserva al editar el formulario y al crear una nueva medición. El borrado elimina asimismo `sociomap.config.pendiente` de ambos soportes.
- Las pruebas automatizadas verifican exportaciones PNG, SVG, PDF, CSV y JSON, la privacidad de nombres y la comparación de dos mediciones.
- El panel público continúa exigiendo 3+/3− exactos, sin añadir abstención ni recogida parcial (decisión expresa del titular).
- En la aplicación se utiliza **SOCIOMAP** como nombre del producto; **sociograma** identifica el tipo de gráfico. Algunos recursos gráficos y documentos históricos conservan la denominación anterior "SOCIOGRAMA" como parte de su identidad original.
- La auditoría automática de accesibilidad y seguridad reduce riesgos, pero **no sustituye** la revisión manual WCAG con NVDA/VoiceOver, el control de exportaciones PDF accesibles ni una auditoría de penetración.

## Retratos opcionales y privacidad (versión fotográfica, 31/10/2026)

Después de crear el grupo, el formulario muestra en cada ficha «Añadir fotografía». Se admiten archivos JPEG, PNG o WebP originales de hasta **6 MB**; un recorte cuadrado comprimido (máximo 18 000 caracteres en formato data URL) se guarda **solo en el navegador**. La miniatura no conserva los metadatos EXIF del original y se vincula al identificador estable del participante, no a su posición ni al texto del nombre. La fotografía puede cambiarse o retirarse sin afectar a las elecciones. No son necesarias fotografías para votar.

En el sociograma interactivo, la opción **«Mostrar códigos y ocultar fotografías»** está activada por defecto. Al desactivarla en una sesión autorizada aparecen los nombres y las fotos disponibles tanto en nodos como en ranking, indicadores y ficha de detalle. Los participantes sin retrato mantienen su avatar-código. La demo pública muestra **ocho retratos vectoriales ficticios**, independientes de los datos reales y sin transferir información personal.

**Privacidad y exportaciones:** las exportaciones PNG/SVG/PDF/JSON con seudónimos no contienen fotos. Al marcar expresamente «Incluir nombres y grupo originales en los archivos», la copia JSON incluye las miniaturas y los gráficos exportados las muestran. El CSV nunca incluye fotografías por seguridad, compatibilidad y tamaño. El JSON de respaldo necesario para nuevas mediciones **sí** conserva fotografías y nombres originales; guárdalo de forma confidencial. Las fotos son identificadores personales: el uso de códigos no garantiza el anonimato. No proceses fotografías sin la finalidad, información y salvaguardas pertinentes.

La interfaz conserva exactamente **3 elecciones positivas y 3 negativas obligatorias** por participante, sin modificar el punto A02.
