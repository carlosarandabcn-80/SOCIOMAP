# Informe técnico de revisión SOCIOGRAMA — 23/10/2026

## Alcance
Revisión del código estático del repositorio, de los flujos de introducción de datos, PDF, almacenamiento y exportación, acompañada de las pruebas automáticas del proyecto. No equivale a una auditoría de penetración, una certificación WCAG ni una evaluación jurídica RGPD. GitHub Pages aloja contenido estático y no ejecuta PHP.

## Mejoras aplicadas
- Cabecera unificada con logotipo y control de accesibilidad identificado por texto alternativo y etiqueta ARIA.
- Menús secundarios eliminados de la cabecera; itinerario principal: inicio → acceso → registro → sociograma.
- Panel reversible de texto ampliado, alto contraste y reducción del movimiento, persistido localmente.
- Alternativa visual estática para el SVG de la portada cuando el usuario prefiere reducir el movimiento.
- Ajuste de jerarquías de título, etiquetas, botones y ayudas; tamaños de texto más legibles; foco visible y controles de 44 píxeles o más.
- Plantilla PDF estándar imprimible A4, con dos papeletas independientes.
- Texto preventivo sobre confidencialidad, finalidad y voluntariedad del cuestionario.

## Seguridad — observaciones verificadas en el código
1. **Procesamiento local:** no se ha incorporado una API de servidor para votos y nombres. Los cálculos y la descarga del cuestionario se realizan en el navegador. Esto reduce la transferencia externa de información, pero **no implica cifrado**.
2. **Persistencia:** los estudios se almacenan en sessionStorage o, voluntariamente, localStorage. La información en el almacenamiento de navegador no está cifrada por la aplicación y puede persistir, especialmente al restaurar sesiones.
3. **Datos personales:** no hay identificación individual de usuarios, autenticación ni segregación de roles. Un navegador compartido no es apropiado para expedientes nominales sensibles; aconsejable usar seudónimos, eliminar el estudio y aplicar controles de acceso del dispositivo.
4. **XSS:** la batería de pruebas estáticas del proyecto busca sumideros HTML inseguros y el código visible construye elementos mediante métodos DOM. Es una mitigación parcial, no prueba la ausencia total de XSS.
5. **CSP:** hay política de seguridad de contenido mediante metadatos HTML, con scripts limitados al propio origen. La directiva `style-src 'unsafe-inline'` debilita el endurecimiento y merece una refactorización futura; algunas políticas, como frame-ancestors, deben implantarse como cabeceras HTTP, no en una etiqueta meta. GitHub Pages no permite gestionar libremente estas cabeceras en este repositorio.
6. **Dependencias:** las bibliotecas PDF se distribuyen localmente en vendor. No se ha llevado a cabo un análisis independiente de CVE ni una prueba de penetración.
7. **Resultados:** los índices de sociometría son descripciones de elecciones dadas bajo un criterio; no proporcionan diagnóstico de una persona ni validan causalidad o impacto de una intervención.

## Límites y recomendaciones antes de uso en entidades
- Elaborar un documento de información y gestión de datos de la entidad, incluyendo base jurídica, finalidades, destinatarios, conservación y derechos. Obtener las autorizaciones que correspondan. Evitar recoger información sensible sin necesidad.
- Revisar contraste y navegación con herramientas automatizadas (axe/Lighthouse), lectores de pantalla (NVDA/VoiceOver) y pruebas de teclado en dispositivos reales antes de afirmar conformidad con WCAG 2.2 AA.
- Mantener copias controladas y cifradas fuera del navegador cuando haya un estudio importante. Para operaciones profesionales multiusuario, disponer de autenticación, autorización, trazabilidad y una infraestructura de datos segura, fuera del alcance del alojamiento estático.
- Permitir protocolos de no respuesta o rechazo a participar. La implementación actual exige tres votos de cada signo por persona; por ello, **no es adecuada para todos los contextos socioeducativos** ni debe obligarse a una persona a emitir votos negativos.
- Revisar el criterio de la pregunta para que la interpretación de «positiva» y «negativa» sea metodológicamente precisa y no estigmatizante.

## Pruebas
El repositorio dispone de pruebas unitarias de cálculo y una batería funcional con Chromium/Playwright, descargas PDF y recorrido de interfaz. Consultar el estado y el resultado efectivo de los trabajos en GitHub Actions; no interpretar el mero inicio de un trabajo como aprobado.
