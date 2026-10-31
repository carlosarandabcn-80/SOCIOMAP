# Auditoría correctiva de SOCIOMAP — 31 de octubre de 2026

**Alcance:** funcionalidades A01, A03, A04, A05 y A06 del informe de auditoría realizado sobre el commit `9560fb0`, además de ampliación de pruebas automáticas de accesibilidad.  
**Exclusión expresa:** **A02 no se modifica**. El formulario público sigue exigiendo exactamente **tres elecciones positivas y tres negativas** a cada participante, con todos los cuestionarios completos antes de calcular resultados. No se han añadido abstenciones, modalidades máximas ni análisis parcial a la interfaz.  
**Naturaleza:** revisión técnica del repositorio y regresiones automatizadas; **no** es validación psicométrica, auditoría de penetración, dictamen jurídico ni certificación WCAG.

## Registro de cambios y decisiones

| Hallazgo | Acción comprobable | Evidencia del código y pruebas |
| --- | --- | --- |
| **A01 — continuidad longitudinal** | Se añadió `Sociometria.nuevaMedicion`, que exige una medición anterior completa, fecha registrada y una nueva fecha estrictamente posterior. Conserva `cohorte`, `ids`, nombres, grupo, pregunta y cuotas; reinicia todas las respuestas a pendientes y mantiene la diagonal en cero. Un cambio de fecha al pulsar «Crear grupo» deja de trasladar los votos antiguos. | `sociometria.js`, `formulario.js`, `formulario.html`, `tests/mediciones-almacenamiento.test.cjs`, `tests/funcional.cjs`. |
| **A03 — borrado de datos** | Se elimina la clave transitoria `sociomap.config.pendiente` tanto de `sessionStorage` como de `localStorage`, además del proyecto y claves históricas. Se mantienen, deliberadamente, las preferencias generales de accesibilidad. No se eliminan archivos descargados. | `almacenamiento.js` y pruebas unitarias y de navegador. |
| **A04 — exportaciones** | La regresión de Chromium comprueba descargas y firmas de PNG, contenido SVG, apertura y metadatos PDF, integridad CSV y estructura JSON, con y sin nombres originales; un informe PDF real se abre con `pdf-lib`. | `tests/funcional.cjs`; bibliotecas PDF de distribución local. |
| **A05 — persistencia** | El formulario recupera la preferencia de almacenamiento persistente al volver del sociograma, conserva esa preferencia al editar y al iniciar la siguiente medición y no cambia silenciosamente a sesión. | `formulario.js`, `almacenamiento.js` y pruebas Node/Playwright. |
| **A06 — coherencia y mantenimiento** | Se precisa la diferencia entre motor interno (2–40, diversas cuotas) y formulario público (7–40, cuota fija 3+/3−). Se corrigen instrucciones que anunciaban opciones de abstención o cálculos parciales no disponibles en la interfaz. Se retira el gráfico oculto redundante y el manejador de demostración no utilizado. «SOCIOMAP» pasa a ser la denominación textual del producto; «sociograma», el diagrama. | Seis páginas HTML, `instrucciones.html`, `README.md`, `ui.js`, `sociograma.js`. |
| **Accesibilidad** | Se agrega revisión automática mediante axe-core en Chromium para las cinco páginas informativas/operativas y el sociograma poblado con datos ficticios, incluyendo etiquetas WCAG 2.2 pertinentes. | `.github/workflows/comprobaciones.yml`, `tests/accesibilidad-browser.cjs`. |

## Protocolo longitudinal

1. Completar la medición de origen (todos los participantes, seis elecciones por persona).
2. En el formulario, indicar una **fecha posterior** y pulsar «Guardar medición actual e iniciar otra fecha».
3. Confirmar la creación: se desencadena la descarga de un **JSON con los nombres originales**, los identificadores y toda la matriz anterior. Comprobar que el navegador ha guardado efectivamente el archivo y proteger su confidencialidad. El sitio estático **no puede garantizar** la persistencia de la descarga en el dispositivo.
4. La matriz activa de la nueva fecha queda vacía; la identidad estable se conserva y se respetan las reglas originales.
5. Recoger de nuevo los votos completos y utilizar el archivo previo en «Comparar dos mediciones» del sociograma.

**Salvaguarda:** el cambio de fecha no puede producirse mediante «Crear grupo» conservando elecciones anteriores. No se inventan fechas para datos antiguos migrados sin fecha conocida. Una comparación longitudinal es descriptiva y no acredita causalidad.

## Protección de datos y límites de uso

La aplicación es estática, sin cuentas, autenticación, roles ni cifrado propio de `sessionStorage`/`localStorage`. El guardado de una medición y la recuperación del navegador requieren equipos bajo control de la entidad responsable. El JSON longitudinal incluye nombres originales y elecciones por exigencia de continuidad documental, **por lo que debe custodiarse fuera del navegador según el procedimiento institucional**.

El borrado dentro de SOCIOMAP no afecta a copias descargadas ni a datos ajenos al estudio. Seudonimizar no equivale a anonimizar las relaciones. Para uso profesional con personas identificables, la entidad debe determinar responsable, base jurídica, información, permisos, retención y evaluación de riesgos. Una auditoría del repositorio no puede establecer por sí sola el cumplimiento del RGPD o la aptitud universal para trabajo con menores.

## Accesibilidad y seguridad, límites de la verificación

La comprobación automática axe-core examina una parte de los criterios WCAG y puede detectar fallos concretos en las pantallas. No demuestra conformidad WCAG 2.2 AA global. No se ha realizado ensayo manual con NVDA/VoiceOver ni una evaluación PDF/UA; los documentos PDF no llevan una estructura etiquetada equivalente a un PDF accesible verificado. El visor gráfico ofrece alternativas textuales HTML. Tampoco se han realizado análisis de penetración ni revisión de vulnerabilidades del código vendorizado por un tercero.

Se mantienen en el repositorio elementos de compatibilidad histórica (por ejemplo, el fixture interno `Sociometria.demo()` y el logotipo gráfico original), que no se confunden con la demostración pública 3+/3−.

## Ejecución verificable

El flujo `.github/workflows/comprobaciones.yml` incluye, en este orden:

```bash
npm ci --ignore-scripts
npm test
npx playwright install --with-deps chromium
npm run test:browser
npm install --no-save --no-package-lock @axe-core/playwright
node tests/accesibilidad-browser.cjs
```

La instalación de axe-core se utiliza únicamente en CI; el producto publicado no depende de terceros durante la visualización.

**Condición de cierre:** todos los trabajos de GitHub Actions deben finalizar con resultado satisfactorio para la revisión exacta que se publique. Los incidentes de CI detectados durante la implantación se corrigen antes de integrar la rama en `main`. Véanse las ejecuciones y el SHA del commit en el historial de GitHub Actions. No se considerarán pruebas de un commit anterior como certificación del último.

## Resultado metodológico

Se corrigen las divergencias longitudinales y de persistencia y se amplía el control de integridad y de accesibilidad automatizada. **A02 queda intacta por decisión expresa del titular**. SOCIOMAP sigue siendo una herramienta de **análisis sociométrico descriptivo**; no realiza diagnósticos personales ni valida inferencias causales.
