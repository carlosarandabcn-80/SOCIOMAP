'use strict';
window.Exportaciones = (() => {
  let pdfReady = null, logoReady = null;
  const tipo = filtro => ({ todos: 'positivas y negativas', '+': 'solo positivas', '-': 'solo negativas', mutuas: 'positivas recíprocas' }[filtro]);
  function lineas(text, max) {
    const result = []; let line = '';
    for (const word of String(text).split(/\s+/)) {
      if (line.length + word.length + 1 > max && line) { result.push(line); line = ''; }
      if (word.length > max) {
        if (line) { result.push(line); line = ''; }
        for (let i = 0; i < word.length; i += max) result.push(word.slice(i, i + max));
      } else line += (line ? ' ' : '') + word;
    }
    if (line) result.push(line);
    return result;
  }
  function logo() {
    if (!logoReady) logoReady = fetch('logo-sociograma.webp').then(r => { if (!r.ok) throw new Error('Logo no disponible'); return r.blob(); }).then(blob => new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
    })).catch(() => null);
    return logoReady;
  }
  async function imagenSVG(source) {
    const box = source.viewBox.baseVal, width = box.width, height = box.height;
    const clone = source.cloneNode(true); clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); clone.setAttribute('width', width); clone.setAttribute('height', height);
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    try {
      const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('No se pudo convertir el gráfico en imagen.')); img.src = url; });
      const scale = Math.min(2, 7800 / width, 7800 / height), canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width * scale); canvas.height = Math.ceil(height * scale);
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('El navegador no permite exportar imágenes.');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!png) throw new Error('No se pudo crear el PNG.');
      return png;
    } finally { URL.revokeObjectURL(url); }
  }
  function graficoBase(data, vista, heatmap = false) {
    if (heatmap) return Graficos.heatmapSVG(data, false);
    const base = UI.svg('svg', { viewBox: '0 0 1100 690' });
    Graficos.grafo(base, data, { ...vista, seudonimos: false }, { prefix: 'exp' });
    base.prepend(UI.svg('rect', { width: 1100, height: 690, fill: '#f5f8fd' }));
    return base;
  }
  async function svgExport(data, vista, heatmap = false) {
    const base = graficoBase(data, vista, heatmap), box = base.viewBox.baseVal, width = Math.max(1000, box.width + 48);
    const chars = Math.floor((width - 48) / 9), pregunta = lineas(data.criterio, chars), group = lineas(data.grupo, Math.floor((width - 48) / 13));
    const head = 140 + pregunta.length * 20 + group.length * 26, body = (width - 48) * box.height / box.width, height = head + body + 145;
    const root = UI.svg('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: `0 0 ${width} ${height}`, width, height, role: 'img' });
    root.append(UI.svg('title', {}, `${heatmap ? 'Matriz visual' : 'Sociograma'} de ${data.grupo}`), UI.svg('desc', {}, 'Exportación descriptiva de elecciones sociométricas. + positiva, - negativa, 0 no elegida, ? pendiente.'));
    root.append(UI.svg('rect', { width, height, fill: '#fff' }));
    const text = (value, y, size = 16, weight = 'normal') => root.append(UI.svg('text', { x: 24, y, fill: '#152e49', 'font-family': 'Arial, sans-serif', 'font-size': size, 'font-weight': weight }, value));
    text(heatmap ? 'SOCIOMAP / MAPA DE CALOR' : 'SOCIOMAP / SOCIOGRAMA', 43, 29, 'bold');
    let y = 78; for (const l of group) { text(l, y, 22); y += 26; }
    text(`Medición: ${UI.fecha(data.fecha, data.fechaNoRegistrada)} · Respuestas: ${data.metricas.respuestas}/${data.nombres.length}`, y + 5); y += 34;
    for (const l of pregunta) { text(l, y, 15); y += 20; }
    text(heatmap ? 'Fila: emisor → columna: destinatario.' : `Vista: ${tipo(vista.filtro)}. Flechas: emisor → destinatario.`, y + 5, 14);
    base.setAttribute('x', 24); base.setAttribute('y', head); base.setAttribute('width', width - 48); base.setAttribute('height', body); root.append(base);
    y = head + body + 28;
    text(heatmap ? '+ Positiva · − Negativa · 0 No elegida · ? Pendiente · — Diagonal' : '+ Azul continua: positiva · − Naranja discontinua: negativa · Tamaño: positivos recibidos', y, 15);
    text(`Regla: ${data.reglas.modo === 'exactos' ? 'cuota exacta' : 'máximo'} ${data.reglas.positivos} + y ${data.reglas.negativos} − por respuesta.`, y + 27, 14);
    text('Lectura descriptiva. No establece diagnósticos, etiquetas personales ni efectos causales.', y + 51, 14);
    text('ARANDA TOOLS · Datos tratados en el navegador', y + 81, 12);
    const image = await logo();
    if (image) root.append(UI.svg('image', { href: image, x: width - 185, y: height - 70, width: 165, height: 55 }));
    return root;
  }
  async function exportarImagen(extension, data, vista, heatmap = false) {
    const source = await svgExport(data, vista, heatmap), filename = `sociomap-${heatmap ? 'matriz' : 'mapa'}-${data.fecha}.${extension}`;
    if (extension === 'svg') UI.descargar(new XMLSerializer().serializeToString(source), filename, 'image/svg+xml;charset=utf-8');
    else UI.descargar(await imagenSVG(source), filename, 'image/png');
  }
  function cargarPDF() {
    if (window.PDFLib && window.fontkit) return Promise.resolve(window.PDFLib);
    if (!pdfReady) pdfReady = Promise.all([['PDFLib', 'vendor/pdf-lib.min.js'], ['fontkit', 'vendor/fontkit.umd.min.js']].map(([global, url]) => {
      if (window[global]) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const script = document.createElement('script'); script.src = url;
        script.onload = resolve; script.onerror = () => { script.remove(); reject(new Error('No se ha podido cargar el generador PDF. Recarga la página.')); };
        document.head.append(script);
      });
    })).then(() => window.PDFLib).catch(e => { pdfReady = null; throw e; });
    return pdfReady;
  }
  async function pdf(data, vista, comparacion = null) {
    const lib = await cargarPDF(), doc = await lib.PDFDocument.create();
    doc.setTitle('SOCIOMAP - Informe sociométrico'); doc.setAuthor('SOCIOMAP · ARANDA TOOLS');
    doc.registerFontkit(window.fontkit);
    const fontBytes = await Promise.all(['DejaVuSans.ttf', 'DejaVuSans-Bold.ttf'].map(async name => {
      const response = await fetch('vendor/' + name); if (!response.ok) throw new Error('No se pudo cargar la tipografía del informe.'); return response.arrayBuffer();
    }));
    const normal = await doc.embedFont(fontBytes[0], { subset: true }), bold = await doc.embedFont(fontBytes[1], { subset: true });
    const caracteres = new Set(normal.getCharacterSet());
    const ink = lib.rgb(.07, .16, .26), muted = lib.rgb(.25, .32, .4);
    let page, y, count = 0;
    const clean = str => String(str).replace(/−/g, '-').replace(/→/g, '->').replace(/\u202f|\u00a0/g, ' ');
    const newPage = title => { page = doc.addPage([595.28, 841.89]); y = 790; count++;
      page.drawText('SOCIOMAP / ARANDA TOOLS', { x: 40, y: 810, size: 9, font: bold, color: muted });
      page.drawText(title, { x: 40, y: 777, size: 20, font: bold, color: ink }); y = 752;
      page.drawText(String(count), { x: 545, y: 24, size: 9, font: normal, color: muted });
    };
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
    async function drawLine(value, x, yy, size = 11, isBold = false) {
      const text = clean(value), font = isBold ? bold : normal;
      try { if ([...text].some(c => !caracteres.has(c.codePointAt(0)))) throw new Error('Glifo no disponible'); font.encodeText(text); page.drawText(text, { x, y: yy, size, font, color: ink }); }
      catch {
        // Conserva nombres Unicode que las fuentes PDF estándar no pueden codificar.
        ctx.font = `${isBold ? 'bold ' : ''}${size * 3}px Arial`;
        const w = Math.ceil(ctx.measureText(text).width + 6); canvas.width = w; canvas.height = Math.ceil(size * 4.5);
        ctx.font = `${isBold ? 'bold ' : ''}${size * 3}px Arial`; ctx.fillStyle = '#132b42'; ctx.textBaseline = 'top'; ctx.fillText(text, 0, 0);
        const image = await doc.embedPng(canvas.toDataURL('image/png'));
        page.drawImage(image, { x, y: yy - size * .3, width: w / 3, height: canvas.height / 3 });
      }
    }
    function envolver(value, size, font) {
      const lines = []; let line = '';
      for (const word of clean(value).replace(/(\d)\s+%/g, '$1\u00a0%').split(/ +/)) {
        const next = line ? line + ' ' + word : word;
        if (font.widthOfTextAtSize(next, size) > 515 && line) { lines.push(line); line = ''; }
        let part = line ? line + ' ' : '';
        for (const character of word) {
          if (font.widthOfTextAtSize(part + character, size) > 515 && part) { lines.push(part); part = ''; }
          part += character;
        }
        line = part;
      }
      if (line) lines.push(line); return lines;
    }
    async function para(value, { size = 11, isBold = false, gap = 7 } = {}) {
      for (const line of envolver(value, size, isBold ? bold : normal)) {
        if (y < 55) newPage('Criterios y resultados (continuación)');
        await drawLine(line, 40, y, size, isBold); y -= size * 1.5;
      }
      y -= gap;
    }
    async function picture(source, maxHeight) {
      const blob = await imagenSVG(source), image = await doc.embedPng(await blob.arrayBuffer());
      const scale = Math.min(515 / image.width, maxHeight / image.height);
      const width = image.width * scale, height = image.height * scale;
      page.drawImage(image, { x: 40 + (515 - width) / 2, y: y - height, width, height }); y -= height + 14;
    }
    newPage('Informe sociométrico');
    await para(data.grupo, { size: 15, isBold: true });
    await para(`Medición: ${UI.fecha(data.fecha, data.fechaNoRegistrada)}. Respuestas: ${data.metricas.respuestas}/${data.nombres.length}.`);
    await para(`Criterio: ${data.criterio}`);
    await para(`Vista del mapa: ${tipo(vista.filtro)}. Flechas del emisor al destinatario.`, { size: 10 });
    await picture(graficoBase(data, vista), Math.min(320, y - 250));
    await para('+ Azul continua: positiva. - Naranja discontinua: negativa. Tamaño: positivos recibidos.', { size: 9 });
    const m = data.metricas;
    await para(`Cobertura: ${UI.pct(m.cobertura)}. Positivas: ${m.totalPos}. Negativas: ${m.totalNeg}. Pares positivos recíprocos: ${m.paresMutPos}.`);
    await para(`Reciprocidad positiva: ${UI.pct(m.reciprocidadPos)}. Densidad positiva: ${UI.pct(m.densidadPos)}. Densidad sobre filas observadas: ${UI.pct(m.densidadObservadaPos)}.`);
    if (m.cobertura < 1) await para('ANÁLISIS PROVISIONAL: faltan respuestas. La ausencia de respuesta no equivale a cero elecciones.', { isBold: true });
    await para('Lectura descriptiva y contextual. No establece diagnósticos ni efectos causales.', { size: 10 });
    newPage('Indicadores por participante');
    await para('+ y -: elecciones recibidas. Entrada +: proporción sobre posibles emisores observados. Mutuas +: pares positivos recíprocos. Interm.: intermediación normalizada.', { size: 10 });
    async function tableHeader() { await drawLine('Participante', 40, y, 10, true); for (const [t, x] of [['+', 255], ['-', 290], ['Entrada +', 325], ['Mutuas +', 415], ['Interm.', 493]]) await drawLine(t, x, y, 9, true); y -= 22; }
    await tableHeader();
    for (const node of data.nodes) {
      const names = lineas(node.name, 30), rowHeight = Math.max(28, names.length * 12 + 8);
      if (y - rowHeight < 55) { newPage('Indicadores (continuación)'); await tableHeader(); }
      for (let i = 0; i < names.length; i++) await drawLine(names[i], 40, y - i * 12, 9);
      for (const [v, x] of [[node.recPos, 255], [node.recNeg, 290], [node.popularidad === null ? 'N/C' : UI.pct(node.popularidad), 325], [node.mutPos, 428], [node.intermediacion.toFixed(3), 493]]) await drawLine(v, x, y, 9);
      y -= rowHeight;
    }
    for (let start = 0; start < data.nodes.length; start += 12) {
      newPage('Gráfico de elecciones recibidas');
      await para('Los valores corresponden al grupo completo, independientemente del filtro del mapa.', { size: 10 });
      await picture(Graficos.barras({ ...data, nodes: data.nodes.slice(start, start + 12) }, false), 620);
    }
    newPage('Criterios y límites del análisis');
    await para(`Pregunta: ${data.criterio}`);
    for (const line of Graficos.metodotexto(data)) await para(line, { size: 10 });
    await para(`Componentes positivos (conexión débil): ${m.componentesPos.length}. Componentes de positivas recíprocas con al menos dos participantes: ${m.subgrupos.length}.`, { size: 10 });
    for (const group of m.subgrupos) await para('Componente recíproco: ' + group.map(i => data.nombres[i]).join(', '), { size: 10 });
    if (comparacion) {
      await para(`Comparación: ${UI.fecha(comparacion.fechaAnterior)} a ${UI.fecha(comparacion.fechaActual)}.`, { isBold: true });
      await para(`Nuevas elecciones positivas: ${comparacion.altas}. Positivas que dejan de aparecer: ${comparacion.bajas}. Cambios de signo: ${comparacion.cambiosSigno}. Variación de pares positivos recíprocos: ${comparacion.paresMutPos}.`, { size: 10 });
      await para('Las diferencias no demuestran causalidad ni prueban por sí solas un cambio de cohesión.', { size: 10 });
    }
    await para('Fórmulas de referencia: documentación oficial de NetworkX (reciprocity, betweenness_centrality y connected_components). Referencias enlazadas en la guía de SOCIOMAP.', { size: 9 });
    await para('Conserva el informe de forma confidencial. Los códigos y las relaciones pueden permitir reidentificar a las personas por contexto.', { size: 9 });
    UI.descargar(await doc.save(), `sociomap-informe-${data.fecha}.pdf`, 'application/pdf');
  }
  return { svgExport, imagenSVG, exportarImagen, pdf, graficoBase };
})();
