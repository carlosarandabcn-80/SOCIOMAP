'use strict';
window.Graficos = (() => {
  const W = 1100, H = 690, POS = '#1768b2', NEG = '#b94a0a', svg = (...args) => UI.svg(...args);
  const nombre = (data, i, aliases) => UI.nombre(data, i, aliases);
  const recortar = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;
  const metodotexto = data => [
    `${data.reglas.modo === 'exactos' ? 'Cuota exacta' : 'Máximo'}: ${data.reglas.positivos} positivas y ${data.reglas.negativos} negativas por respuesta.`,
    'Entrada positiva relativa = positivos recibidos / posibles emisores que han respondido (sin incluirse a sí mismo).',
    'Reciprocidad positiva = elecciones positivas que tienen retorno positivo / total de elecciones positivas. Sin elecciones, no calculable.',
    'Densidad positiva = elecciones positivas / N(N - 1). Densidad observada = elecciones positivas / R(N - 1).',
    'Intermediación = caminos mínimos dirigidos positivos que pasan por el nodo, normalizada por (N - 1)(N - 2).',
    'Los subgrupos son componentes conectados mediante elecciones positivas recíprocas; no son comunidades validadas.',
    'El resultado es descriptivo y contextual: no acredita liderazgo, aislamiento, rechazo personal ni efectos causales.',
    ...(data.reglas.modo === 'exactos' ? ['Con cuota exacta y respuestas completas, la densidad está fijada por la cuota y el tamaño del grupo. No mide por sí sola cohesión.'] : [])
  ];
  function resumen(data, container) {
    const m = data.metricas;
    const values = [[`${m.respuestas}/${m.participantes}`, 'Respuestas registradas'], [UI.pct(m.cobertura), 'Cobertura'],
      [m.totalPos, 'Elecciones positivas'], [m.totalNeg, 'Elecciones negativas'], [m.paresMutPos, 'Pares positivos recíprocos'],
      [UI.pct(m.reciprocidadPos), 'Reciprocidad positiva'], [UI.pct(m.densidadPos), 'Densidad positiva sobre todo el grupo'],
      [UI.pct(m.densidadObservadaPos), 'Densidad positiva sobre filas observadas']];
    container.replaceChildren(UI.el('div', { className: 'metrics' }, values.map(([value, label]) => UI.el('div', { className: 'metric' }, UI.el('strong', {}, value), UI.el('span', {}, label)))));
    if (m.cobertura < 1) container.append(UI.el('p', { className: 'status error' }, 'Análisis provisional: faltan respuestas. Los ceros no sustituyen a las personas que no han respondido.'));
    if (data.reglas.modo === 'exactos') container.append(UI.el('p', { className: 'hint' }, 'La cuota exacta limita las elecciones. Con todas las respuestas, la densidad positiva depende de la cuota y de N; evita interpretarla como medida independiente de cohesión.'));
  }
  function ranking(data, container, aliases) {
    container.replaceChildren(UI.tabla(['Participante', 'Respuesta', '+ recibidos', '− recibidos', 'Entrada + relativa', 'Pares + recíprocos', 'Intermediación +'],
      data.nodes.map(v => [FotosUI.persona(data, v.id, aliases), v.respondida ? 'Registrada' : 'Pendiente', v.recPos, v.recNeg, UI.pct(v.popularidad), v.mutPos,
        v.intermediacion.toLocaleString('es-ES', { maximumFractionDigits: 3 })]), 'Indicadores por participante. La entrada relativa usa los emisores observados. La intermediación usa caminos positivos dirigidos.'));
  }
  function barras(data, aliases) {
    const n = data.nodes.length, height = 85 + n * 48, max = Math.max(1, ...data.nodes.flatMap(v => [v.recPos, v.recNeg]));
    const result = svg('svg', { viewBox: `0 0 1100 ${height}`, class: 'bars', role: 'img', 'aria-label': 'Barras de elecciones recibidas. Los mismos valores están disponibles en la tabla.' });
    result.append(svg('rect', { width: 1100, height, fill: '#f5f8fd' }));
    result.append(svg('text', { x: 24, y: 28, fill: '#18334f', 'font-size': 16, 'font-family': 'Arial' }, 'Elecciones recibidas: positivas (+ azul) y negativas (- naranja)'));
    for (let i = 0; i <= Math.min(max, 6); i++) {
      const tick = max * i / Math.min(max, 6), x = 220 + 810 * tick / max;
      result.append(svg('line', { x1: x, x2: x, y1: 62, y2: height - 15, stroke: '#cad5e2' }));
      result.append(svg('text', { x, y: 55, fill: '#334155', 'font-size': 12, 'text-anchor': 'middle' }, Number.isInteger(tick) ? tick : tick.toFixed(1)));
    }
    data.nodes.forEach((v, index) => {
      const y = 72 + index * 48;
      const photo=!aliases && data.fotos?.[v.uid];
      if(photo){
        const id='barras-foto-'+index;
        const clip=svg('clipPath',{id});clip.append(svg('circle',{cx:36,cy:y+17,r:16}));
        result.append(clip);
        result.append(svg('image',{href:photo,x:20,y:y+1,width:32,height:32,
          'clip-path':'url(#'+id+')',preserveAspectRatio:'xMidYMid slice'}));
      }
      result.append(svg('text', { x: 204, y: y + 19, 'text-anchor': 'end', fill: '#142b43', 'font-size': 14 }, recortar(nombre(data, v.id, aliases), 23)));
      for (const [value, offset, color, sign] of [[v.recPos, 0, POS, '+'], [v.recNeg, 18, NEG, '-']]) {
        result.append(svg('rect', { x: 220, y: y + offset, width: 810 * value / max, height: 13, fill: color }));
        result.append(svg('text', { x: 228 + 810 * value / max, y: y + offset + 11, fill: '#142b43', 'font-size': 12 }, `${sign}${value}`));
      }
    });
    return result;
  }
  function posiciones(data, vista, force = false) {
    const n = data.nodes.length, result = Object.create(null), cols = Math.ceil(Math.sqrt(n * 1.6)), rows = Math.ceil(n / cols);
    data.nodes.forEach((v, i) => {
      const saved = vista.posiciones[v.uid];
      if (saved && (!force || saved.fija)) { result[v.uid] = { ...saved }; return; }
      const angle = -Math.PI / 2 + i * 2 * Math.PI / n;
      result[v.uid] = vista.disposicion === 'rejilla'
        ? { x: 100 + (i % cols) * 900 / Math.max(1, cols - 1), y: 95 + Math.floor(i / cols) * 500 / Math.max(1, rows - 1), fija: false }
        : { x: W / 2 + 420 * Math.cos(angle), y: H / 2 + 245 * Math.sin(angle), fija: false };
    });
    if (vista.disposicion === 'automatico' && (force || Object.keys(vista.posiciones).length < n)) {
      for (let step = 0; step < 180; step++) {
        const shifts = data.nodes.map(() => ({ x: 0, y: 0 }));
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
          const a = result[data.ids[i]], b = result[data.ids[j]], dx = a.x - b.x || .1, dy = a.y - b.y || .1;
          const sq = Math.max(200, dx * dx + dy * dy), f = Math.min(6, 2500 / sq);
          shifts[i].x += dx * f / Math.sqrt(sq); shifts[i].y += dy * f / Math.sqrt(sq);
          shifts[j].x -= dx * f / Math.sqrt(sq); shifts[j].y -= dy * f / Math.sqrt(sq);
        }
        data.links.filter(l => l.type === '+').forEach(l => {
          const a = result[data.ids[l.source]], b = result[data.ids[l.target]], dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy) || 1;
          const f = (distance - 175) * .008;
          shifts[l.source].x += dx / distance * f; shifts[l.source].y += dy / distance * f;
          shifts[l.target].x -= dx / distance * f; shifts[l.target].y -= dy / distance * f;
        });
        data.nodes.forEach((v, i) => { const p = result[v.uid]; if (p.fija) return;
          p.x = Math.max(65, Math.min(1035, p.x + shifts[i].x)); p.y = Math.max(65, Math.min(625, p.y + shifts[i].y));
        });
      }
    }
    // Resolver colisiones al crear una disposición, respetando las posiciones fijadas.
    if (force || Object.keys(vista.posiciones).length < n) {
      for (let pass = 0; pass < 50; pass++) for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const a = result[data.ids[i]], b = result[data.ids[j]], dx = b.x - a.x || .01, dy = b.y - a.y || .01;
        const distance = Math.hypot(dx, dy), min = radio(data, data.nodes[i]) + radio(data, data.nodes[j]) + 12;
        if (distance >= min || a.fija && b.fija) continue;
        const movement = (min - distance) / (a.fija || b.fija ? 1 : 2);
        for (const [p, sign] of [[a, -1], [b, 1]]) if (!p.fija) {
          p.x = Math.max(65, Math.min(1035, p.x + sign * dx / distance * movement));
          p.y = Math.max(65, Math.min(625, p.y + sign * dy / distance * movement));
        }
      }
    }
    return result;
  }
  const radio = (data, node) => 22 + 16 * Math.sqrt(node.recPos / Math.max(1, data.nodes.length - 1));
  function grafo(container, data, vista, { selected = null, interactivo = false, prefix = 'g' } = {}) {
    const title = svg('title', { id: prefix + '-title' }, 'Mapa de elecciones sociométricas');
    const desc = svg('desc', { id: prefix + '-desc' }, 'Flechas del emisor al destinatario. Positivas continuas azules y negativas discontinuas naranjas. Los valores equivalentes aparecen en las tablas.');
    container.replaceChildren(title, desc);
    container.setAttribute('aria-labelledby', `${prefix}-title ${prefix}-desc`);
    container.setAttribute('role', interactivo ? 'group' : 'img');
    const defs = svg('defs');
    for (const [kind, color] of [['pos', POS], ['neg', NEG]]) {
      const marker = svg('marker', { id: prefix + '-' + kind, viewBox: '0 -5 10 10', refX: 9, refY: 0, markerWidth: 8, markerHeight: 8, orient: 'auto', markerUnits: 'userSpaceOnUse' });
      marker.append(svg('path', { d: 'M0,-4L9,0L0,4Z', fill: color })); defs.append(marker);
    }
    const links = svg('g', { class: 'links' }), nodes = svg('g', { class: 'nodes' });
    container.append(defs, links, nodes);
    data.links.forEach(l => {
      if ((vista.filtro === '+' || vista.filtro === '-') && vista.filtro !== l.type || vista.filtro === 'mutuas' && !(l.type === '+' && l.reciproca)) return;
      const a = vista.posiciones[data.ids[l.source]], b = vista.posiciones[data.ids[l.target]], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      const bend = data.matriz[l.target][l.source] && data.matriz[l.target][l.source] !== '0' ? 30 : 8;
      const cx = (a.x + b.x) / 2 - dy / d * bend, cy = (a.y + b.y) / 2 + dx / d * bend;
      const sa = Math.hypot(cx - a.x, cy - a.y) || 1, sb = Math.hypot(cx - b.x, cy - b.y) || 1;
      const ra = radio(data, data.nodes[l.source]) + 2, rb = radio(data, data.nodes[l.target]) + 5;
      const start = [a.x + (cx - a.x) / sa * ra, a.y + (cy - a.y) / sa * ra];
      const end = [b.x + (cx - b.x) / sb * rb, b.y + (cy - b.y) / sb * rb];
      const path = svg('path', { class: 'link', d: `M${start} Q${cx},${cy} ${end}`, fill: 'none', stroke: l.type === '+' ? POS : NEG,
        'stroke-width': selected === l.source || selected === l.target ? 3 : 1.7, 'stroke-dasharray': l.type === '-' ? '7 5' : 'none',
        opacity: selected !== null && selected !== l.source && selected !== l.target ? .12 : .8,
        'marker-end': `url(#${prefix}-${l.type === '+' ? 'pos' : 'neg'})`, 'data-source': l.source, 'data-target': l.target, 'data-type': l.type });
      path.append(svg('title', {}, `${nombre(data, l.source, vista.seudonimos)} → ${nombre(data, l.target, vista.seudonimos)}: ${l.type}`)); links.append(path);
    });
    data.nodes.forEach(v => {
      const p = vista.posiciones[v.uid], r = radio(data, v), name = nombre(data, v.id, vista.seudonimos), selectedNode = selected === v.id;
      const node = svg('g', { class: 'node', transform: `translate(${p.x},${p.y})`, 'data-node': v.id,
        ...(interactivo ? { tabindex: 0, role: 'button', 'aria-label': `${name} +${v.recPos} / −${v.recNeg}. ${v.recPos} positivas y ${v.recNeg} negativas recibidas${p.fija ? '; posición fijada' : ''}`, 'aria-pressed': selectedNode } : {}) });
      node.append(svg('title', {}, `${name}: +${v.recPos}, −${v.recNeg}. ${p.fija ? 'Posición fijada.' : ''}`));
      const photo = !vista.seudonimos && data.fotos?.[v.uid];
      node.append(svg('circle',{r,fill: selectedNode?'#b8dfff':'#e7eef6',
        stroke:selectedNode?'#0d4b7a':'#5d7994','stroke-width':selectedNode?4:2.5}));
      if(photo){
        const clipId=prefix+'-foto-'+v.id;
        const clip=svg('clipPath',{id:clipId}); clip.append(svg('circle',{r:r-3}));
        defs.append(clip);
        node.append(svg('image',{href:photo,x:-(r-3),y:-(r-3),
          width:2*(r-3),height:2*(r-3),
          preserveAspectRatio:'xMidYMid slice',
          'clip-path':'url(#'+clipId+')','pointer-events':'none'}));
        node.append(svg('rect',{x:-Math.max(37,r+7),y:r+4,width:2*Math.max(37,r+7),height:34,rx:10,
          fill:'#f8fbff',stroke:'#d6e3ee','pointer-events':'none'}));
        node.append(svg('text',{y:r+18,'text-anchor':'middle',fill:'#15324d',
          'font-size':12,'font-weight':700,'pointer-events':'none'},recortar(name,12)));
        node.append(svg('text',{y:r+31,'text-anchor':'middle',fill:'#35536d',
          'font-size':10,'pointer-events':'none'},`+${v.recPos} · −${v.recNeg}`));
      } else {
        node.append(svg('text', {y:-3,'text-anchor':'middle',fill:'#102f4d','font-size':13,
          'font-family':'Arial','font-weight':700,'pointer-events':'none'}, recortar(name,11)));
        node.append(svg('text',{y:13,'text-anchor':'middle',fill:'#183e60',
          'font-size':10,'pointer-events':'none'},`+${v.recPos} / −${v.recNeg}`));
      }
      if(p.fija)node.append(svg('circle',{r:r+5,fill:'none',stroke:'#2c5d8a',
        'stroke-width':1.5,'stroke-dasharray':'3 4','pointer-events':'none'}));
      nodes.append(node);
    });
  }
  function heatmap(data, container, aliases) {
    const table = UI.el('table', { className: 'heatmap' }, UI.el('caption', {}, 'Fila: emisor. Columna: destinatario. + positiva; − negativa; 0 no elegida; ? pendiente; — diagonal.'));
    table.append(UI.el('thead', {}, UI.el('tr', {}, UI.el('th', { scope: 'col' }, 'De / A'), data.nombres.map((_, i) => UI.el('th', { scope: 'col' }, nombre(data, i, aliases))))));
    table.append(UI.el('tbody', {}, data.matriz.map((row, i) => UI.el('tr', {}, UI.el('th', { scope: 'row' }, nombre(data, i, aliases)), row.map((v, j) => {
      const value = i === j ? '—' : v === null ? '?' : v === '-' ? '−' : v;
      const kind = i === j ? 'diagonal' : v === '+' ? 'positive' : v === '-' ? 'negative' : v === null ? 'unanswered' : 'neutral';
      return UI.el('td', { className: kind, title: `${nombre(data, i, aliases)} → ${nombre(data, j, aliases)}: ${value}` }, value);
    })))));
    container.replaceChildren(table);
  }
  function heatmapSVG(data, aliases) {
    const cell = 38, left = 200, top = 150, width = left + data.nombres.length * cell + 25, height = top + data.nombres.length * cell + 30;
    const result = svg('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': 'Matriz de elecciones' });
    result.append(svg('rect', { width, height, fill: '#fff' }));
    data.nombres.forEach((_, i) => {
      result.append(svg('text', { x: left - 12, y: top + i * cell + 24, 'text-anchor': 'end', fill: '#17324d', 'font-size': 12 }, recortar(nombre(data, i, aliases), 25)));
      result.append(svg('text', { transform: `translate(${left + i * cell + 24},${top - 12}) rotate(-55)`, fill: '#17324d', 'font-size': 12 }, recortar(nombre(data, i, aliases), 20)));
    });
    data.matriz.forEach((row, i) => row.forEach((v, j) => {
      const fill = i === j ? '#d1d8e2' : v === '+' ? '#c6e2ff' : v === '-' ? '#ffe2c7' : v === null ? '#c7ced8' : '#f8fafc';
      result.append(svg('rect', { x: left + j * cell, y: top + i * cell, width: cell, height: cell, fill, stroke: '#94a3b8' }));
      result.append(svg('text', { x: left + j * cell + 19, y: top + i * cell + 25, 'text-anchor': 'middle', 'font-size': 16, fill: '#17324d' }, i === j ? '—' : v === null ? '?' : v === '-' ? '−' : v));
    }));
    return result;
  }
  return { W, H, POS, NEG, resumen, ranking, barras, posiciones, grafo, heatmap, heatmapSVG, metodotexto };
})();
