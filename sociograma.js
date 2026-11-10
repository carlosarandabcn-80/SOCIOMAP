'use strict';
(() => {
  const S = Sociometria, $ = id => document.getElementById(id), loaded = Almacen.leer();
  let proyecto = loaded.proyecto, data;
  try {
    if (!proyecto) throw new Error(loaded.error || 'No hay un estudio guardado.');
    const { reglas, respondidas } = proyecto.datos;
    if (reglas.modo === 'exactos' && reglas.positivos === 3 && reglas.negativos === 3 &&
        !respondidas.every((_, i) => S.respuestaCompleta(proyecto.datos, i)))
      throw new Error('Completa las respuestas de todas las personas para abrir el sociograma.');
    data = S.calcular(proyecto.datos);
  }
  catch (e) { UI.vacio($('estudio'), e.message); return; }
  let vista = proyecto.vista, persistente = loaded.persistente, selected = null, comparison = null, drag = null;
  const history = [], graph = $('graph'), signature = JSON.stringify(proyecto.datos);
  let lecturaMedicion = 0;
  // La vista identificada solo se aplica a la página abierta, incluso en estudios anteriores.
  vista.seudonimos = true;
  vista.posiciones = Graficos.posiciones(data, vista);
  function guardar() {
    try {
      const current = Almacen.leer();
      if (!current.proyecto || JSON.stringify(current.proyecto.datos) !== signature) throw new Error('El estudio ha cambiado en otra página. Recarga para recuperar la versión actual.');
      proyecto = Almacen.guardar({ datos: proyecto.datos, vista: { ...vista, seudonimos: true } }, persistente);
      $('guardado').textContent = persistente ? 'Estudio y posiciones guardados en este navegador hasta su borrado.' : 'Estudio y posiciones guardados en la sesión de esta pestaña.';
      return true;
    } catch (e) { UI.mensaje('No se pudo guardar. ' + e.message + ' Exporta una copia JSON antes de salir.', true); return false; }
  }
  const nombre = i => UI.nombre(data, i, vista.seudonimos);
  function ajustarVista() { graph.setAttribute('viewBox', Graficos.encuadre(vista).join(' ')); }
  function remember() { history.push(JSON.parse(JSON.stringify(vista))); if (history.length > 30) history.shift(); $('deshacer').disabled = false; }
  function dibujar(focusId = null) {
    Graficos.grafo(graph, data, vista, { selected, interactivo: true, prefix: 'mapa' });
    if (focusId !== null) graph.querySelector(`[data-node="${focusId}"]`)?.focus({ preventScroll: true });
  }
  function detalle() {
    $('participante').value = selected === null ? '' : String(selected);
    $('fijar').disabled = selected === null;
    document.querySelectorAll('.move-node').forEach(button => { button.disabled = selected === null || vista.posiciones[data.ids[selected]].fija; });
    if (selected === null) { $('detalle').hidden = true; $('seleccionInfo').textContent = 'Vista del grupo completo.'; return; }
    const node = data.nodes[selected], fixed = vista.posiciones[node.uid].fija;
    $('fijar').textContent = fixed ? 'Liberar posición' : 'Fijar posición';
    $('seleccionInfo').textContent = `Seleccionado: ${nombre(selected)}. Se resaltan sus conexiones visibles.`;
    const relations = data.links.filter(l => l.source === selected || l.target === selected);
    $('detalle').hidden = false;
    $('detalle').replaceChildren(UI.el('div',{className:'detalle-cabecera'},FotosUI.avatar(data,selected,vista.seudonimos,'avatar-detalle'),UI.el('h3', {}, nombre(selected))), UI.el('p', {}, `${node.recPos} positivas y ${node.recNeg} negativas recibidas. ${node.mutPos} pares positivos recíprocos. Respuesta ${node.respondida ? 'registrada' : 'pendiente'}.`),
      UI.el('p', { className: 'hint' }, 'Todas sus elecciones registradas, incluidas las que oculta el filtro del mapa:'),
      relations.length ? UI.el('ul', {}, relations.map(l => UI.el('li', {}, `${nombre(l.source)} → ${nombre(l.target)}: ${l.type === '+' ? 'positiva (+)' : 'negativa (−)'}${l.reciproca ? ', recíproca' : ''}`))) : UI.el('p', {}, 'No hay elecciones registradas que impliquen a esta persona. Esto no demuestra aislamiento.'));
  }
  function indicadores() {
    $('grupoInfo').textContent = `${vista.seudonimos ? 'Grupo seudonimizado' : data.grupo} · ${UI.fecha(data.fecha, data.fechaNoRegistrada)} · ${data.nombres.length} participantes`;
    $('participante').replaceChildren(UI.el('option', { value: '' }, 'Todo el grupo'), ...data.nodes.map(v => UI.el('option', { value: v.id }, nombre(v.id))));
    Graficos.resumen(data, $('resumen')); Graficos.ranking(data, $('ranking'), vista.seudonimos);
    // Las barras accesibles aparecen en el ranking; el gráfico SVG redundante no se renderiza oculto.
    AnalisisRelacional.grafico($('graficoRankingApp'), data, id => { seleccionar(id, true); UI.desplazar(graph, 'center'); },
      n => nombre(n.id), n => FotosUI.foto(data, n.id, vista.seudonimos));
    AnalisisRelacional.destacar($('graficoRankingApp'),selected);
    AnalisisRelacional.insertar($('descripcionApp'), data, n => nombre(n.id));
    $('relaciones').replaceChildren(UI.tabla(['Emisor', 'Destinatario', 'Elección', 'Recíproca del mismo signo'], data.links.map(l => [nombre(l.source), nombre(l.target), l.type === '+' ? 'Positiva (+)' : 'Negativa (−)', l.reciproca ? 'Sí' : 'No']), 'Relaciones dirigidas del estudio completo, sin aplicar los filtros del mapa.'));
    $('subgrupos').replaceChildren(UI.el('h3', {}, 'Conexiones exploratorias'), UI.el('p', {}, `${data.metricas.componentesPos.length} componentes en el grafo positivo (conexión débil). ${data.metricas.subgrupos.length} componentes de elecciones positivas recíprocas con al menos dos personas.`),
      ...data.metricas.subgrupos.map((group, i) => UI.el('p', { className: 'hint' }, `Componente recíproco ${i + 1}: ${group.map(nombre).join(', ')}.`)),
      UI.el('p', { className: 'hint' }, 'Conexión por cadenas de elecciones mutuas: no implica que todas las personas se elijan entre sí ni identifica comunidades validadas.'));
    $('metodologia').replaceChildren(...Graficos.metodotexto(data).map(text => UI.el('p', { className: 'hint' }, text)));
    mostrarComparacion(); detalle();
  }
  function seleccionar(id, focus = false) { selected = id; dibujar(focus ? id : null); detalle(); AnalisisRelacional.destacar($('graficoRankingApp'),selected); }
  $('filtro').value = vista.filtro; $('disposicion').value = vista.disposicion; $('seudonimos').checked = vista.seudonimos; $('recordar').checked = persistente;
  $('filtro').addEventListener('change', () => { vista.filtro = $('filtro').value; dibujar(); guardar(); });
  $('disposicion').addEventListener('change', () => { remember(); vista.disposicion = $('disposicion').value; vista.posiciones = Graficos.posiciones(data, vista, true); dibujar(); ajustarVista(); guardar(); detalle(); });
  $('seudonimos').addEventListener('change', () => { vista.seudonimos = $('seudonimos').checked; $('buscar').value = ''; indicadores(); dibujar(); });
  $('participante').addEventListener('change', () => seleccionar($('participante').value === '' ? null : Number($('participante').value)));
  $('buscar').addEventListener('input', () => {
    const query = $('buscar').value.trim().toLocaleLowerCase('es');
    if (!query) { seleccionar(null); return; }
    const exact = data.nodes.find(v => nombre(v.id).toLocaleLowerCase('es') === query), matches = data.nodes.filter(v => nombre(v.id).toLocaleLowerCase('es').includes(query));
    seleccionar(exact?.id ?? matches[0]?.id ?? null);
    if (!matches.length) $('seleccionInfo').textContent = 'No hay participantes que coincidan con la búsqueda.';
    else if (!exact && matches.length > 1) $('seleccionInfo').textContent += ` Hay ${matches.length} coincidencias. Usa la lista para elegir otra.`;
  });
  $('limpiarSeleccion').addEventListener('click', () => { $('buscar').value = ''; seleccionar(null); });
  function fijar(id, focus = false) { if (id === null) return; remember(); const p = vista.posiciones[data.ids[id]]; p.fija = !p.fija; dibujar(focus ? id : null); detalle(); guardar(); }
  $('fijar').addEventListener('click', () => fijar(selected));
  $('deshacer').addEventListener('click', () => {
    if (!history.length) return;
    const old = history.pop(); vista.posiciones = old.posiciones; vista.disposicion = old.disposicion;
    $('disposicion').value = vista.disposicion; $('deshacer').disabled = !history.length; dibujar(); detalle(); guardar();
  });
  // Alternativa de un solo clic al arrastre, criterio WCAG 2.5.7.
  document.querySelectorAll('.move-node').forEach(button => button.addEventListener('click', () => {
    if (selected === null) return;
    const p = vista.posiciones[data.ids[selected]];
    if (!p || p.fija) return;
    const steps = { left: [-24, 0], right: [24, 0], up: [0, -24], down: [0, 24] };
    const [dx, dy] = steps[button.dataset.move] || [0, 0];
    if (!dx && !dy) return;
    const x = Math.max(65, Math.min(1035, p.x + dx));
    const y = Math.max(65, Math.min(625, p.y + dy));
    if (x === p.x && y === p.y) return;
    remember(); p.x = x; p.y = y;
    seleccionar(selected); guardar();
  }));
  function punto(event, inversa = graph.getScreenCTM().inverse()) {
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(inversa);
  }
  graph.addEventListener('pointerdown', event => {
    if (event.button !== 0 || drag) return;
    const node = event.target.closest('[data-node]');
    if (node) {
      const id = Number(node.dataset.node), p = vista.posiciones[data.ids[id]], start = punto(event);
      seleccionar(id); graph.querySelector(`[data-node="${id}"]`)?.focus({ preventScroll: true });
      if (!p.fija) drag = { id, start, original: { ...p }, before: JSON.parse(JSON.stringify(vista)), moved: false, pointer: event.pointerId };
    } else {
      const inversa = graph.getScreenCTM().inverse(), { x, y, width, height } = graph.viewBox.baseVal;
      drag = { pan: true, inversa, start: punto(event, inversa), box: { x, y, width, height }, pointer: event.pointerId };
    }
    if (drag) { graph.setPointerCapture(event.pointerId); event.preventDefault(); }
  });
  graph.addEventListener('pointermove', event => {
    if (!drag || drag.pointer !== event.pointerId) return;
    if (drag.pan) {
      const pt = punto(event, drag.inversa), box = drag.box;
      graph.setAttribute('viewBox', `${box.x - pt.x + drag.start.x} ${box.y - pt.y + drag.start.y} ${box.width} ${box.height}`);
      return;
    }
    const pt = punto(event), p = vista.posiciones[data.ids[drag.id]];
    p.x = Math.max(65, Math.min(1035, drag.original.x + pt.x - drag.start.x)); p.y = Math.max(65, Math.min(625, drag.original.y + pt.y - drag.start.y));
    drag.moved = Math.hypot(p.x - drag.original.x, p.y - drag.original.y) > 1; dibujar();
  });
  function terminar(event) {
    if (!drag || drag.pointer !== event.pointerId) return;
    const ended = drag; drag = null;
    if (graph.hasPointerCapture(event.pointerId)) graph.releasePointerCapture(event.pointerId);
    const cancelar = event.type !== 'pointerup';
    if (ended.pan) {
      if (cancelar) graph.setAttribute('viewBox', Object.values(ended.box).join(' '));
      return;
    }
    if (cancelar || !ended.moved) vista.posiciones[data.ids[ended.id]] = ended.original;
    else { history.push(ended.before); if (history.length > 30) history.shift(); $('deshacer').disabled = false; guardar(); }
    dibujar(ended.id); detalle();
  }
  graph.addEventListener('pointerup', terminar); graph.addEventListener('pointercancel', terminar);
  graph.addEventListener('lostpointercapture', terminar);
  graph.addEventListener('click', event => {
    const node = event.target.closest('[data-node]');
    if (node && event.detail === 0) seleccionar(Number(node.dataset.node), true);
  });
  graph.addEventListener('keydown', event => {
    const node = event.target.closest('[data-node]'); if (!node) return;
    const id = Number(node.dataset.node), p = vista.posiciones[data.ids[id]], step = event.shiftKey ? 40 : 12;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      if (p.fija) { UI.mensaje('Libera la posición antes de mover este nodo.'); return; }
      remember(); if (event.key === 'ArrowLeft') p.x -= step; if (event.key === 'ArrowRight') p.x += step; if (event.key === 'ArrowUp') p.y -= step; if (event.key === 'ArrowDown') p.y += step;
      p.x = Math.max(65, Math.min(1035, p.x)); p.y = Math.max(65, Math.min(625, p.y)); seleccionar(id, true); guardar();
    } else if (event.key === 'Enter') { event.preventDefault(); seleccionar(id, true); }
    else if (event.key === ' ') { event.preventDefault(); selected = id; fijar(id, true); AnalisisRelacional.destacar($('graficoRankingApp'), id); }
    else if (event.key === 'Escape') { seleccionar(null); graph.querySelector(`[data-node="${id}"]`)?.focus({ preventScroll: true }); }
  });
  function zoom(factor) {
    const box = graph.viewBox.baseVal, width = Math.max(350, Math.min(2200, box.width * factor)), height = width * Graficos.H / Graficos.W;
    graph.setAttribute('viewBox', `${box.x + (box.width - width) / 2} ${box.y + (box.height - height) / 2} ${width} ${height}`);
  }
  // El desplazamiento del lienzo también debe ser posible con un solo clic.
  document.querySelectorAll('.pan-view').forEach(button => button.addEventListener('click', () => {
    const box=graph.viewBox.baseVal, shift=box.width*.12;
    const steps={left:[-shift,0],right:[shift,0],up:[0,-shift],down:[0,shift]};
    const [dx,dy]=steps[button.dataset.pan]||[0,0];
    graph.setAttribute('viewBox',[box.x+dx,box.y+dy,box.width,box.height].join(' '));
  }));
  $('acercar').addEventListener('click', () => zoom(.8)); $('alejar').addEventListener('click', () => zoom(1.25)); $('ajustar').addEventListener('click', ajustarVista);
  graph.addEventListener('wheel', e => { if (e.ctrlKey) { e.preventDefault(); zoom(e.deltaY > 0 ? 1.1 : .9); } }, { passive: false });
  $('recordar').addEventListener('change', () => { const old = persistente; persistente = $('recordar').checked; if (!guardar()) { persistente = old; $('recordar').checked = old; } });
  $('borrarDatos').addEventListener('click', () => {
    if (!confirm('¿Borrar el estudio y sus posiciones de este navegador? Los archivos descargados se borran por separado.')) return;
    try { Almacen.borrar(); location.href = 'formulario.html'; } catch (e) { UI.mensaje(e.message, true); }
  });
  $('incluirNombres').checked = $('incluirFotos').checked = false;
  $('incluirFotos').disabled = true;
  $('incluirNombres').addEventListener('change', () => {
    $('incluirFotos').disabled = !$('incluirNombres').checked;
    if ($('incluirFotos').disabled) $('incluirFotos').checked = false;
  });
  function datosExport() {
    if (!$('incluirNombres').checked) return S.seudonimizar(proyecto.datos);
    return $('incluirFotos').checked ? proyecto.datos : { ...proyecto.datos, fotos: {} };
  }
  function vistaExport() {
    return { ...vista, posiciones: structuredClone(vista.posiciones), seudonimos: true };
  }
  function accion(id, handler) { $(id).addEventListener('click', async () => { $(id).disabled = true; UI.mensaje('Preparando el archivo…');
    try { await handler(); UI.mensaje('Archivo preparado para descargar. Conserva la copia de forma confidencial.'); } catch (e) { UI.mensaje('No se pudo exportar. ' + e.message, true); } finally { $(id).disabled = false; }
  }); }
  accion('exportPNG', () => Exportaciones.exportarImagen('png', S.calcular(datosExport()), vistaExport()));
  accion('exportSVG', () => Exportaciones.exportarImagen('svg', S.calcular(datosExport()), vistaExport()));
  accion('exportPDF', () => Exportaciones.pdf(S.calcular(datosExport()), vistaExport(), comparison));
  accion('exportJSON', () => UI.descargar(JSON.stringify({ formato: 'SOCIOMAP', datos: datosExport(), vista: vistaExport() }, null, 2), `sociomap-${data.fecha}.json`, 'application/json'));
  accion('exportCSV', () => UI.descargar(S.aCSV(datosExport()), `sociomap-${data.fecha}.csv`, 'text/csv;charset=utf-8'));
  function mostrarComparacion() {
    if (!comparison) return;
    const c = comparison, delta = v => v === null ? 'No calculable' : `${v >= 0 ? '+' : ''}${(v * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })} puntos porcentuales`;
    $('comparacion').replaceChildren(UI.el('h3', {}, `${UI.fecha(c.fechaAnterior)} → ${UI.fecha(c.fechaActual)}`),
      UI.el('p', {}, `${c.altas} nuevas elecciones positivas; ${c.bajas} positivas que dejan de aparecer; ${c.cambiosSigno} elecciones que cambian de signo.`),
      UI.el('p', {}, `Densidad positiva: ${delta(c.densidadPos)}. Reciprocidad positiva: ${delta(c.reciprocidadPos)}. Pares positivos recíprocos: ${c.paresMutPos >= 0 ? '+' : ''}${c.paresMutPos}.`),
      UI.el('div', { className: 'table-scroll', tabindex: 0, role: 'region', 'aria-label': 'Cambios por participante' }, UI.tabla(['Participante', 'Cambio + recibidos', 'Cambio − recibidos', 'Cambio intermediación'],
        c.personas.map(p => [nombre(p.id), `${p.positivos >= 0 ? '+' : ''}${p.positivos}`, `${p.negativos >= 0 ? '+' : ''}${p.negativos}`, p.intermediacion.toLocaleString('es-ES', { maximumFractionDigits: 3 })]), 'Diferencias de la medición actual respecto de la anterior.')),
      UI.el('p', { className: 'hint' }, 'Los cambios son descriptivos. No prueban el efecto de una intervención. Con cuotas exactas, la densidad del grupo completo se mantiene fija.'));
  }
  $('compararArchivo').addEventListener('change', async () => {
    const file = $('compararArchivo').files[0]; if (!file) return;
    const lectura = ++lecturaMedicion;
    comparison = null; $('comparacion').replaceChildren();
    UI.mensaje('Leyendo y comprobando la medición anterior…', false, 'mensajeComparacion');
    try {
      const previous = await UI.archivo(file);
      if (lectura !== lecturaMedicion) return;
      comparison = S.comparar(proyecto.datos, previous.datos);
      mostrarComparacion();
      UI.mensaje('Mediciones compatibles. Comparación calculada.', false, 'mensajeComparacion');
    } catch (e) {
      if (lectura === lecturaMedicion) UI.mensaje(e.message, true, 'mensajeComparacion');
    } finally { if (lectura === lecturaMedicion) $('compararArchivo').value = ''; }
  });
  window.addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
  window.addEventListener('storage', e => { if ([S.STORAGE_KEY, null].includes(e.key)) location.reload(); });
  indicadores(); dibujar(); ajustarVista(); guardar();
})();
