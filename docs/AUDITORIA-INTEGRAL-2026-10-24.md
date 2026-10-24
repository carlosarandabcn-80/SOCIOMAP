# SOCIOMAP — auditoría técnica y socioeducativa (24 de octubre de 2026)

## Alcance y control de cambios
Repositorio verificado: `carlosarandabcn-80/SOCIOMAP`. Rama de partida: `main`, commit `f5d1c2a78a613c2fc11c0508d1e8899672c5d0dd`.
Rama de trabajo: `codex/auditoria-sociomap-20261024`. Los cambios **no se han integrado en producción**: el encargo exige no publicar en `main` sin autorización expresa.

Revisados: arquitectura estática, modelo sociométrico, función de cálculo, gráfico SVG, ranking, demostración, formularios, almacenamiento, exportaciones, CSP, pruebas Node y Playwright. La revisión no equivale a un pentest, a una evaluación jurídica independiente ni a una certificación de accesibilidad WCAG.

## Inventario de hallazgos y prioridades

| Prioridad | Componente | Evidencia verificable | Impacto | Estado |
| --- | --- | --- | --- | --- |
| P1 | Sociograma/ranking | La selección de un nodo no actualizaba el estado visual/ARIA del ranking. | Falta de correspondencia entre representaciones. | Corregido en rama de trabajo. |
| P1 | Ranking principal | Las barras usaban etiquetas P1… incluso cuando se elegía mostrar nombres reales. | Incoherencia de identidad visual y comprensión. | Corregido en rama de trabajo, respetando seudónimos. |
| P1 | Interpretación relacional | La descripción anterior no diferenciaba con suficiente claridad datos, indicadores y límites; llamaba «pares» a una cifra por nodo. | Posible lectura excesivamente concluyente. | Redacción revisada en módulo compartido. |
| P1 | Aplicación en entidades | Almacenamiento del estudio en navegador sin cifrado específico ni autenticación/roles. | Acceso de terceros en equipos compartidos. | Pendiente: exige arquitectura y decisión organizativa. |
| P1 | Ética de recogida | El registro de 3 elecciones negativas obligatorias no contempla abstenciones ni respuestas parciales por participante. | Riesgo de participación forzada y sesgo de no respuesta. | Pendiente de rediseño metodológico. |
| P2 | Demo y lógica de ejemplo | `Sociometria.demo()` conserva una muestra de 2+/1− para pruebas legadas; el caso público usa 3+/3− exactos. | Modelos de demostración distintos podían confundirse. | `demoPublica()` centraliza la muestra pública y `demo.json` ya refleja sus datos; fixture legado preservado. |
| P2 | Accesibilidad | SVG interactivo con alternativas de teclado y tabla, pero sin comprobación NVDA/VoiceOver ni auditoría completa WCAG. | Barreras potenciales en lector de pantalla. | Parcial; requiere pruebas manuales. |
| P2 | Seguridad CSP | `style-src 'unsafe-inline'` en páginas HTML. | Política de estilos más permisiva. | Pendiente de retirada gradual de estilos inline. |
| P1 | Gráfica de ranking | La regla `min-width` en barras originales daba anchura visible incluso con valor cero. | Representación cuantitativa engañosa. | Corregido: pistas con etiquetas externas y relleno de anchura proporcional, incluido cero. |
| P2 | CSS | Hoja monolítica con múltiples bloques de sobrescritura y hoja duplicada específica para acceso. | Riesgo de especificidad, caché y regresiones visuales. | Pendiente de consolidación visual verificada. |
| P2 | Trazabilidad profesional | No hay registros de auditoría de acceso a datos ni gestión multiusuario. | Inadecuado para servicio centralizado con datos reales. | Pendiente; arquitectura estática sin servidor. |

## Mejoras realizadas en la rama
- Componente `analisis-relacional.js`: selección accesible mediante `aria-pressed`, `data-rank-node` y función `destacar`; texto que diferencia observaciones, indicadores y límites sin diagnósticos.
- `sociograma.js`: sincronización bidireccional de selección con gráfico de ranking, preservando la configuración de seudonimización del estudio.
- `demo-publica.js`: sincronización nodos/gráfico, incluido restablecimiento de posiciones.
- `estilos.css`: estado visual seleccionado inequívoco, foco y ajustes móviles.
- `tests/funcional.cjs`: aserciones Playwright para sincronización en demo y aplicación, zoom de la demo y recuperación de vista.
- `sociometria.js` y `demo-publica.js`: generación única del caso público 3+3, con prueba matemática y ejemplo `demo.json` alineado.
- Barras de ranking con pista separada del dato: **cero elecciones equivale a cero anchura**, sin barras ficticias de tamaño mínimo.

## Criterios sociométricos verificados en código
- Una elección positiva o negativa constituye una arista dirigida entre emisor y receptor; no equivale a causalidad ni a diagnóstico.
- `recPos` y `recNeg`: número de aristas positivas/negativas **entrantes** por participante.
- `paresMutPos`: mitad de la suma de vínculos positivos recíprocos registrados por nodo, porque cada par se cuenta dos veces.
- Cobertura: `respuestas / participantes`. Cuando faltan respuestas, los resultados reflejan solo las observadas.
- Las matrices distinguen `null` (no respondió) de `'0'` (no eligió al destinatario) según `respondidas`; conservar esta distinción es crítico.
- Los rankings describen **elecciones recibidas**. Los empates no demuestran equivalencia en otras métricas ni permiten etiquetar a las personas.

## Pruebas reproducibles
- `npm ci --ignore-scripts`
- `npm test` (pruebas matemáticas y de validación)
- `npx playwright install --with-deps chromium`
- `npm run test:browser` (creación, PDF universal, matriz, sociograma, exportación, demo, teclado, ranking, filtros y móvil)
- CI: `.github/workflows/comprobaciones.yml`, rama `codex/**` incluida.
- Los estados de GitHub Actions deben consultarse para el SHA **final**; ejecutar pruebas no demuestra conformidad universal con WCAG ni ausencia de vulnerabilidades.

## Requisitos previos a un uso profesional con personas identificables
1. Determinar responsable del tratamiento, finalidades concretas, base jurídica, información, conservación, acceso y protocolos de borrado conforme al contexto institucional.
2. Evaluar riesgos y necesidad de EIPD, especialmente con menores o datos relacionales delicados. Consultar con el delegado de protección de datos de la entidad.
3. Establecer mecanismos voluntarios de no respuesta, reglas para datos faltantes y protocolos de devolución de resultados no estigmatizantes.
4. Realizar ensayos de usabilidad con profesionales, revisión WCAG 2.2 AA con tecnologías de asistencia, medidas de rendimiento y pruebas de seguridad independientes.
5. Evitar equipos compartidos para estudios con datos nominales mientras no exista un almacenamiento protegido y una política de sesiones.

## Estado de entrega
El trabajo se entrega como **rama para revisión**, no como despliegue. No se declara que la aplicación esté validada científicamente ni que sea apta sin más para expedientes nominativos reales. Mantener o rechazar cada cambio según las pruebas del commit final y la revisión profesional.

## Referencias normativas y técnicas verificadas
- W3C, *Web Content Accessibility Guidelines (WCAG) 2.2*, recomendación: https://www.w3.org/TR/WCAG22/ . Referencia técnica para criterios de accesibilidad; no implica una certificación por incluirlos.
- Agencia Española de Protección de Datos, *Realización de evaluaciones de impacto de protección de datos*, actualización del 23 de abril de 2025: https://www.aepd.es/derechos-y-deberes/cumple-tus-deberes/medidas-de-cumplimiento/realizacion-de-evaluaciones-de .
- AEPD, *¿Qué debe incluir una EIPD?*: https://www.aepd.es/preguntas-frecuentes/2-tus-obligaciones-como-responsable-del-tratamiento/10-evaluacion-de-impacto/FAQ-0229-que-debe-incluir-una-evaluacion-de-impacto-de-proteccion-de-datos .
La obligación de EIPD depende del riesgo y del contexto concreto del tratamiento; no se declara automática para todo uso de SOCIOMAP.
