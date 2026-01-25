# Sociograma Interactivo — SOCIOMAP

**Sociomap** es una herramienta web interactiva para visualizar dinámicas de afinidad en grupos de trabajo. Utiliza visualización de grafos para mostrar relaciones positivas y negativas entre miembros, con nodos interactivos y exportación en formato imagen.

## 🚀 Características

- Visualización interactiva de sociogramas (D3.js)
- Cálculo automático del líder sociométrico
- Escala de color para relaciones positivas (verde) y negativas (rojo)
- Visualización de votos positivos y negativos dentro de cada nodo
- Gráfico de barras comparativo (Chart.js)
- Exportación a PNG con:
  - Fecha y nombre del grupo
  - Logo institucional
- Bloqueo de navegación hacia atrás
- Texto profesional para reorganización manual del gráfico

## 📁 Estructura del Proyecto

/Sociomap
│
├── logo.png # Logo institucional
├── Sociograma_web.html # Página principal interactiva
├── INDEX.html # Página de inicio o menú principal
├── formulario.html # Formulario para votación de afinidad
├── instrucciones.html # Instrucciones para los participantes
├── tabla.csv # Datos cargados desde formulario (opcional)
└── README.md # Este archivo


## 🖼 Captura de pantalla

![Sociograma](demo.png)

## 🛠 Requisitos Técnicos

- Navegador moderno (Chrome, Firefox, Edge)
- Servidor local o remoto para cargar correctamente `logo.png` y `html2canvas`
- No se recomienda abrir con `file://`, usar `localhost` o servidor simple:

```bash
# Recomendado:
python -m http.server

🧪 Cómo usar

Completar el formulario de afinidad (formulario.html)

Generar los datos sociométricos (votos positivos/negativos)

Visualizar el sociograma en Sociograma_web.html

Reorganizar los nodos manualmente si es necesario

Exportar el gráfico con los botones disponibles

📦 Exportación

Los botones permiten exportar:

El sociograma interactivo (como imagen PNG)

El gráfico de barras de votos

Cada imagen incluirá:

Fecha

Nombre del grupo

Logo institucional en la parte inferior

📄 Licencia

© 2026 — Este proyecto es propiedad de su autor. Uso educativo o interno permitido. Contactar para otros usos.

Gracias por usar Sociomap 💙
