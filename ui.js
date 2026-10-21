'use strict';
window.UI = {
  el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === false || value === null || value === undefined) continue;
      if (key === 'className') node.className = value;
      else node.setAttribute(key, value === true ? '' : String(value));
    }
    for (const child of children.flat(Infinity)) if (child !== null && child !== undefined) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    return node;
  },
  svg(tag, attrs = {}, text) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    if (text !== undefined) node.textContent = String(text);
    return node;
  },
  pct(value) { return value === null ? 'No calculable' : (100 * value).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' %'; },
  fecha(value, desconocida = false) { return desconocida ? 'Fecha no registrada' : new Date(value + 'T12:00:00').toLocaleDateString('es-ES'); },
  hoy() { const now = new Date(); return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-'); },
  nombre(data, i, aliases) { return aliases ? `P${i + 1}` : data.nombres[i]; },
  mensaje(text, error = false, id = 'mensaje') {
    const node = document.getElementById(id);
    if (!node) return;
    node.textContent = text; node.classList.toggle('error', error); node.classList.toggle('success', !error && Boolean(text));
  },
  descargar(content, filename, type) {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  },
  async archivo(file) {
    if (!file) throw new Error('Elige un archivo.');
    if (file.size > Sociometria.MAX_FILE) throw new Error('El archivo supera 1 MB.');
    return Sociometria.importar(await file.text(), file.name.split('.').pop());
  },
  tabla(headers, rows, caption) {
    const t = UI.el('table', {}, UI.el('caption', {}, caption));
    t.append(UI.el('thead', {}, UI.el('tr', {}, headers.map(h => UI.el('th', { scope: 'col' }, h)))));
    t.append(UI.el('tbody', {}, rows.map(row => UI.el('tr', {}, row.map((v, i) => UI.el(i ? 'td' : 'th', i ? {} : { scope: 'row' }, v))))));
    return t;
  },
  vacio(container, error) {
    container.replaceChildren(UI.el('div', { className: 'empty' }, UI.el('h2', {}, 'No hay un análisis disponible'),
      UI.el('p', {}, error || 'Completa una matriz o carga un estudio para continuar.'), UI.el('a', { className: 'btn primary', href: 'formulario.html' }, 'Volver al formulario')));
  },
  prepararComun() {
    document.querySelectorAll('[data-year]').forEach(node => { node.textContent = new Date().getFullYear(); });
    document.querySelectorAll('[data-demo]').forEach(button => button.addEventListener('click', () => {
      try {
        if (Almacen.leer().proyecto && !confirm('La demostración sustituirá el estudio abierto. Exporta antes una copia si quieres conservarlo. ¿Continuar?')) return;
        Almacen.guardar({ datos: Sociometria.demo() }); location.href = 'sociograma_interactivo.html';
      } catch (e) { UI.mensaje('No se pudo abrir la demostración. ' + e.message, true); }
    }));
  }
};
document.addEventListener('DOMContentLoaded', UI.prepararComun);
