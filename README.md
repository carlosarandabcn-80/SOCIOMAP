# SOCIOMAP

Herramienta web de análisis sociométrico descriptivo para la intervención socioeducativa. Autoría: **Carlos Aranda · ARANDA TOOLS**.

[Sitio web](https://carlosarandabcn-80.github.io/SOCIOMAP/) · [Guía de uso y criterios](instrucciones.html) · [Cambios y validación](docs/MEJORAS-COMPLETAS.md)

## Funciones

- Una matriz dirigida compartida por formulario, tabla, barras, sociograma y mapa de calor. Cálculo por destinatario, sin autovotos ni estados de resultados obsoletos.
- Entre 2 y 40 participantes; cuotas exactas o máximas, elecciones negativas opcionales, pregunta y fecha registradas. La suma de límites no puede superar N − 1.
- Distinción entre respuestas pendientes (`null`) y personas no elegidas (`"0"`). El análisis parcial necesita aceptación expresa en el formulario y se identifica como provisional.
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
3. Calcula resultados y abre el sociograma o el mapa de calor.
4. Exporta una copia JSON para continuar otro día. Para otra medición, exporta primero la actual y utiliza «Nueva medición del mismo grupo»: conserva los identificadores y vacía las respuestas.
5. Carga la copia anterior en la comparación. Se exigen mismo estudio, participantes, pregunta y reglas, ambas recogidas completas y una fecha anterior registrada.

`demo.json` y `tabla.csv` contienen una demostración ficticia y pueden importarse desde el formulario. El CSV es una matriz con configuración en su primera fila y cabeceras en la segunda. Conserva ambas: no se admiten matrices genéricas sin reglas ni identidades. Las copias JSON incluyen también la vista y las posiciones.

## Datos y privacidad

Los datos se procesan en el navegador y no se envían a un servidor de análisis. El servidor de alojamiento recibe las solicitudes normales de los archivos del sitio. No se incorporan analítica, llamadas a IA ni recursos externos durante el uso de la aplicación.

Por defecto se usa `sessionStorage` de la pestaña. Algunos navegadores restauran sesiones cerradas. La opción «Recordar» utiliza `localStorage` hasta el borrado. Este almacenamiento **no está cifrado por la aplicación**; no equivale a una cuenta privada ni a una copia de seguridad. Utiliza códigos y guarda las identidades por separado. En equipos compartidos, termina con «Borrar datos».

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

Se puede indicar un navegador ya instalado con `CHROMIUM_EXECUTABLE_PATH` o un canal con `BROWSER_CHANNEL`. `QA_DIR` permite guardar capturas y archivos generados fuera del repositorio. GitHub Actions ejecuta ambas suites para ramas `main`, `codex/**` y pull requests.

## Archivos principales

| Archivo | Responsabilidad |
| --- | --- |
| `sociometria.js` | Contrato v2, validación, migración v1, cálculos, comparación e intercambio CSV/JSON |
| `almacenamiento.js` | Sesión, persistencia optativa y borrado |
| `ui.js`, `estilos.css` | Elementos seguros del DOM, presentación y accesibilidad |
| `formulario.js` | Configuración, captura de respuestas y resultados |
| `graficos.js` | Disposiciones y representaciones SVG, tablas y mapa de calor |
| `sociograma.js`, `mapa-calor.js` | Interacción de las vistas |
| `exportaciones.js` | PNG, SVG e informe PDF |
| `vendor/` | Generación PDF, motor tipográfico, fuentes y sus avisos de licencia |
| `tests/` | Regresión de cálculo, contrato, recursos y recorridos en navegador |

## Autoría y uso

© 2026 Carlos Aranda · ARANDA TOOLS. Se conserva el régimen de uso indicado originalmente: uso educativo o interno; contactar con el autor para otros usos. `pdf-lib` conserva su licencia MIT en `vendor/pdf-lib.LICENSE.md`; el README y los metadatos originales de `@pdf-lib/fontkit` identifican su licencia MIT y autoría. Las fuentes DejaVu conservan su aviso en `vendor/DejaVu-LICENSE.txt`.
