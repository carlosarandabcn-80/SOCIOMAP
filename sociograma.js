'use strict';
(() => {
  const S = Sociometria, $ = id => document.getElementById(id), loaded = Almacen.leer();
  let proyecto = loaded.proyecto, data;
  try { if (!proyecto) throw new Error(loaded.error || 'No hay un estudio guardado.'); data = S.calcular(proyecto.datos); }
  catch (e) { UI.vacio($('estudio'), e.message); return; }
  let vista = proyecto.vista, persistente = loaded.persistente, selected = null, comparison = null, drag = null;
  const history = [], graph = $('graph'), signature = JSON.stringify(proyecto.datos);
  vista.posiciones = Graficos.posiciones(data, vista);
  function guardar() {
    try {
      const current = Almacen.leer();
      if (!current.proyecto || JSON.stringify(current.proyecto.datos) !== signature) throw new Error('El estudio ha cambiado en otra página. Recarga para recuperar la versión actual.');
      proyecto = Almacen.guardar({ datos: proyecto.datos, vista }, persistente);
      $('guardado').textContent = persistente ? 'Estudio y posiciones guardados en este navegador hasta su borrado.' : 'Estudio y posiciones guardados en la sesión de esta pestaña.';
      return true;
    } catch (e) { UI.mensaje('No se pudo guardar. ' + e.message + ' Exporta una copia JSON antes de salir.', true); return false; }
  }
  const nombre = i => UI.nombre(data, i, vista.seudonimos);
  function remember() { history.push(JSON.parse(JSON.stringify(vista))); if (history.length > 30) history.shift(); $('deshacer').disabled = false; }
  function dibujar(focusId = null) {
    Graficos.grafo(graph, data, vista, { selected, interactivo: true, prefix: 'mapa' });
    if (focusId !== null) graph.querySelector(`[data-node="${focusId}"]`)?.focus({ preventScroll: true });
  }
  function detalle() {
    $('participante').value = selected === null ? '' : String(selected);
    $('fijar').disabled = selected === null;
    if (selected === null) { $('detalle').hidden = true; $('seleccionInfo').textContent = 'Vista del grupo completo.'; return; }
    const node = data.nodes[selected], fixed = vista.posiciones[node.uid].fija;
    $('fijar').textContent = fixed ? 'Liberar posición' : 'Fijar posición';
    $('seleccionInfo').textContent = `Seleccionado: ${nombre(selected)}. Se resaltan sus conexiones visibles.`;
    const relations = data.links.filter(l => l.source === selected || l.target === selected);
    $('detalle').hidden = false;
    $('detalle').replaceChildren(UI.el('h3', {}, nombre(selected)), UI.el('p', {}, `${node.recPos} positivas y ${node.recNeg} negativas recibidas. ${node.mutPos} pares positivos recíprocos. Respuesta ${node.respondida ? 'registrada' : 'pendiente'}.`),
      UI.el('p', { className: 'hint' }, 'Todas sus elecciones registradas, incluidas las que oculta el filtro del mapa:'),
      relations.length ? UI.el('ul', {}, relations.map(l => UI.el('li', {}, `${nombre(l.source)} → ${nombre(l.target)}: ${l.type === '+' ? 'positiva (+)' : 'negativa (−)'}${l.reciproca ? ', recíproca' : ''}`))) : UI.el('p', {}, 'No hay elecciones registradas que impliquen a esta persona. Esto no demuestra aislamiento.'));
  }
  function indicadores() {
    $('grupoInfo').textContent = `${vista.seudonimos ? 'Grupo seudonimizado' : data.grupo} · ${UI.fecha(data.fecha, data.fechaNoRegistrada)} · ${data.nombres.length} participantes`;
    $('participante').replaceChildren(UI.el('option', { value: '' }, 'Todo el grupo'), ...data.nodes.map(v => UI.el('option', { value: v.id }, nombre(v.id))));
    Graficos.resumen(data, $('resumen')); Graficos.ranking(data, $('ranking'), vista.seudonimos);
    $('chart').replaceChildren(Graficos.barras(data, vista.seudonimos));
    AnalisisRelacional.grafico($('graficoRankingApp'),data,id=>{seleccionar(id);document.getElementById('graph').scrollIntoView({behavior:'smooth',block:'center'});});
    AnalisisRelacional.insertar($('descripcionApp'),data);
    $('relaciones').replaceChildren(UI.tabla(['Emisor', 'Destinatario', 'Elección', 'Recíproca del mismo signo'], data.links.map(l => [nombre(l.source), nombre(l.target), l.type === '+' ? 'Positiva (+)' : 'Negativa (−)', l.reciproca ? 'Sí' : 'No']), 'Relaciones dirigidas del estudio completo, sin aplicar los filtros del mapa.'));
    $('subgrupos').replaceChildren(UI.el('h3', {}, 'Conexiones exploratorias'), UI.el('p', {}, `${data.metricas.componentesPos.length} componentes en el grafo positivo (conexión débil). ${data.metricas.subgrupos.length} componentes de elecciones positivas recíprocas con al menos dos personas.`),
      ...data.metricas.subgrupos.map((group, i) => UI.el('p', { className: 'hint' }, `Componente recíproco ${i + 1}: ${group.map(nombre).join(', ')}.`)),
      UI.el('p', { className: 'hint' }, 'Conexión por cadenas de elecciones mutuas: no implica que todas las personas se elijan entre sí ni identifica comunidades validadas.'));
    $('metodologia').replaceChildren(...Graficos.metodotexto(data).map(text => UI.el('p', { className: 'hint' }, text)));
    mostrarComparacion(); detalle();
  }
  function seleccionar(id, focus = false) { selected = id; dibujar(focus ? id : null); detalle(); }
  $('filtro').value = vista.filtro; $('disposicion').value = vista.disposicion; $('seudonimos').checked = vista.seudonimos; $('recordar').checked = persistente;
  $('filtro').addEventListener('change', () => { vista.filtro = $('filtro').value; dibujar(); guardar(); });
  $('disposicion').addEventListener('change', () => { remember(); vista.disposicion = $('disposicion').value; vista.posiciones = Graficos.posiciones(data, vista, true); dibujar(); guardar(); detalle(); });
  $('seudonimos').addEventListener('change', () => { vista.seudonimos = $('seudonimos').checked; $('buscar').value = ''; indicadores(); dibujar(); guardar(); });
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
  function punto(event) { const point = graph.createSVGPoint(); point.x = event.clientX; point.y = event.clientY; return point.matrixTransform(graph.getScreenCTM().inverse()); }
  graph.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const node = event.target.closest('[data-node]');
    if (node) {
      const id = Number(node.dataset.node), p = vista.posiciones[data.ids[id]], start = punto(event);
      seleccionar(id); graph.querySelector(`[data-node="${id}"]`)?.focus({ preventScroll: true });
      if (!p.fija) drag = { id, start, original: { ...p }, before: JSON.parse(JSON.stringify(vista)), moved: false, pointer: event.pointerId };
    } else drag = { pan: true, clientX: event.clientX, clientY: event.clientY, box: { x: graph.viewBox.baseVal.x, y: graph.viewBox.baseVal.y, width: graph.viewBox.baseVal.width, height: graph.viewBox.baseVal.height }, pointer: event.pointerId };
    if (drag) { graph.setPointerCapture(event.pointerId); event.preventDefault(); }
  });
  graph.addEventListener('pointermove', event => {
    if (!drag || drag.pointer !== event.pointerId) return;
    if (drag.pan) {
      const rect = graph.getBoundingClientRect(); graph.setAttribute('viewBox', `${drag.box.x - (event.clientX - drag.clientX) * drag.box.width / rect.width} ${drag.box.y - (event.clientY - drag.clientY) * drag.box.height / rect.height} ${drag.box.width} ${drag.box.height}`); return;
    }
    const pt = punto(event), p = vista.posiciones[data.ids[drag.id]];
    p.x = Math.max(65, Math.min(1035, drag.original.x + pt.x - drag.start.x)); p.y = Math.max(65, Math.min(625, drag.original.y + pt.y - drag.start.y));
    drag.moved = Math.hypot(p.x - drag.original.x, p.y - drag.original.y) > 1; dibujar();
  });
  function terminar(event) {
    if (!drag || drag.pointer !== event.pointerId) return;
    const ended = drag; drag = null;
    if (graph.hasPointerCapture(event.pointerId)) graph.releasePointerCapture(event.pointerId);
    if (!ended.pan && ended.moved) { history.push(ended.before); if (history.length > 30) history.shift(); $('deshacer').disabled = false; guardar(); }
    if (!ended.pan) { dibujar(ended.id); detalle(); }
  }
  graph.addEventListener('pointerup', terminar); graph.addEventListener('pointercancel', terminar);
  graph.addEventListener('keydown', event => {
    const node = event.target.closest('[data-node]'); if (!node) return;
    const id = Number(node.dataset.node), p = vista.posiciones[data.ids[id]], step = event.shiftKey ? 40 : 12;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      if (p.fija) { UI.mensaje('Libera la posición antes de mover este nodo.'); return; }
      remember(); if (event.key === 'ArrowLeft') p.x -= step; if (event.key === 'ArrowRight') p.x += step; if (event.key === 'ArrowUp') p.y -= step; if (event.key === 'ArrowDown') p.y += step;
      p.x = Math.max(65, Math.min(1035, p.x)); p.y = Math.max(65, Math.min(625, p.y)); dibujar(id); guardar();
    } else if (event.key === 'Enter') { event.preventDefault(); seleccionar(id, true); }
    else if (event.key === ' ') { event.preventDefault(); fijar(id, true); }
    else if (event.key === 'Escape') { seleccionar(null); }
  });
  function zoom(factor) {
    const box = graph.viewBox.baseVal, width = Math.max(350, Math.min(2200, box.width * factor)), height = width * Graficos.H / Graficos.W;
    graph.setAttribute('viewBox', `${box.x + (box.width - width) / 2} ${box.y + (box.height - height) / 2} ${width} ${height}`);
  }
  $('acercar').addEventListener('click', () => zoom(.8)); $('alejar').addEventListener('click', () => zoom(1.25)); $('ajustar').addEventListener('click', () => graph.setAttribute('viewBox', '0 0 1100 690'));
  graph.addEventListener('wheel', e => { if (e.ctrlKey) { e.preventDefault(); zoom(e.deltaY > 0 ? 1.1 : .9); } }, { passive: false });
  $('recordar').addEventListener('change', () => { const old = persistente; persistente = $('recordar').checked; if (!guardar()) { persistente = old; $('recordar').checked = old; } });
  $('borrarDatos').addEventListener('click', () => {
    if (!confirm('¿Borrar el estudio y sus posiciones de este navegador? Los archivos descargados se borran por separado.')) return;
    try { Almacen.borrar(); location.href = 'formulario.html'; } catch (e) { UI.mensaje(e.message, true); }
  });
  const datosExport = () => S.calcular($('incluirNombres').checked ? proyecto.datos : S.seudonimizar(proyecto.datos));
  function accion(id, handler) { $(id).addEventListener('click', async () => { $(id).disabled = true; UI.mensaje('Preparando el archivo…');
    try { await handler(); UI.mensaje('Archivo preparado para descargar. Conserva la copia de forma confidencial.'); } catch (e) { UI.mensaje('No se pudo exportar. ' + e.message, true); } finally { $(id).disabled = false; }
  }); }
  accion('exportPNG', () => Exportaciones.exportarImagen('png', datosExport(), vista));
  accion('exportSVG', () => Exportaciones.exportarImagen('svg', datosExport(), vista));
  accion('exportPDF', () => Exportaciones.pdf(datosExport(), vista, comparison));
  accion('exportJSON', () => UI.descargar(JSON.stringify({ formato: 'SOCIOMAP', datos: S.validarDatos(datosExport()), vista: { ...vista, seudonimos: true } }, null, 2), `sociomap-${data.fecha}.json`, 'application/json'));
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
    comparison = null; $('comparacion').replaceChildren();
    UI.mensaje('Leyendo y comprobando la medición anterior…', false, 'mensajeComparacion');
    try { const previous = await UI.archivo(file); comparison = S.comparar(proyecto.datos, previous.datos); mostrarComparacion(); UI.mensaje('Mediciones compatibles. Comparación calculada.', false, 'mensajeComparacion'); }
    catch (e) { UI.mensaje(e.message, true, 'mensajeComparacion'); }
    finally { $('compararArchivo').value = ''; }
  });
  window.addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
  window.addEventListener('storage', e => { if ([S.STORAGE_KEY, null].includes(e.key)) location.reload(); });
  indicadores(); dibujar(); guardar();
})();
