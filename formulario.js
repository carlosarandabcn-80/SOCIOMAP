'use strict';
(() => {
  const S = Sociometria, $ = id => document.getElementById(id);
  let proyecto = null, persistente = false, configDirty = false, restored = false;
  for (let i = 2; i <= 40; i++) $('num').add(new Option(i, i));
  $('num').value = '7'; $('fecha').value = UI.hoy();
  const guardar = () => {
    if (!proyecto) return false;
    try {
      Almacen.guardar(proyecto, persistente);
      $('guardado').textContent = persistente ? 'Guardado en este navegador hasta que lo borres.' : 'Guardado temporal en esta pestaña. Exporta una copia para conservarlo.';
      return true;
    } catch (e) { $('guardado').textContent = 'No se pudo guardar: ' + e.message + '. Exporta una copia JSON antes de salir.'; return false; }
  };
  function limpiarResultados() {
    $('resultadosPanel').hidden = true; $('ranking').replaceChildren(); $('chart').replaceChildren();
    $('btnSociograma').hidden = true; $('btnCalor').hidden = true;
  }
  function cargarConfig() {
    const d = proyecto.datos;
    $('grupo').value = d.grupo; $('fecha').value = d.fechaNoRegistrada ? UI.hoy() : d.fecha;
    $('num').value = String(d.nombres.length); $('modo').value = d.reglas.modo;
    $('criterio').value = d.criterio; $('positivos').value = d.reglas.positivos; $('negativos').value = d.reglas.negativos;
    $('custom').checked = d.nombres.some((name, i) => name !== `P${i + 1}`);
    $('namesBox').hidden = !$('custom').checked; $('names').value = d.nombres.join('\n');
    configDirty = false;
  }
  function actualizarBotones() {
    for (const id of ['copiaJSON', 'copiaCSV', 'nuevaMedicion']) $(id).disabled = !proyecto;
  }
  function crearTablaDOM() {
    const d = proyecto.datos, n = d.nombres.length;
    const table = UI.el('table', { id: 'tablaVotos' }, UI.el('caption', {}, 'Matriz dirigida. Fila = emisor; columna = destinatario. Marca primero la respuesta registrada para habilitar su fila.'));
    table.append(UI.el('thead', {}, UI.el('tr', {}, UI.el('th', { scope: 'col' }, 'De / A'), d.nombres.map(name => UI.el('th', { scope: 'col' }, name)), UI.el('th', { scope: 'col' }, 'Registro y validación'))));
    const body = UI.el('tbody');
    for (let i = 0; i < n; i++) {
      const row = UI.el('tr', { 'data-row': i, className: d.respondidas[i] ? '' : 'missing' }, UI.el('th', { scope: 'row' }, d.nombres[i]));
      for (let j = 0; j < n; j++) {
        if (i === j) { row.append(UI.el('td', { className: 'diagonal', 'aria-label': 'Sin autovoto' }, '—')); continue; }
        const select = UI.el('select', { className: 'cell', 'data-source': i, 'data-target': j,
          'aria-label': `${d.nombres[i]} hacia ${d.nombres[j]}`, disabled: !d.respondidas[i] },
          UI.el('option', { value: '0' }, '0'), UI.el('option', { value: '+' }, '+'), UI.el('option', { value: '-' }, '−'));
        select.value = d.matriz[i][j] ?? '0';
        select.classList.toggle('cell-pos', select.value === '+'); select.classList.toggle('cell-neg', select.value === '-');
        select.addEventListener('change', () => {
          proyecto.datos.matriz[i][j] = select.value;
          select.classList.toggle('cell-pos', select.value === '+'); select.classList.toggle('cell-neg', select.value === '-');
          limpiarResultados(); guardar(); validarTabla(); UI.mensaje('');
        });
        row.append(UI.el('td', {}, select));
      }
      const check = UI.el('input', { type: 'checkbox', id: `respuesta-${i}`, 'data-response': i }); check.checked = d.respondidas[i];
      check.addEventListener('change', () => {
        if (!check.checked && d.matriz[i].some(v => v === '+' || v === '-')) {
          if (!confirm('Marcar esta respuesta como pendiente borrará las elecciones de su fila. ¿Continuar?')) { check.checked = true; return; }
        }
        d.respondidas[i] = check.checked;
        d.matriz[i] = Array.from({ length: n }, (_, j) => i === j || check.checked ? '0' : null);
        limpiarResultados(); guardar(); crearTablaDOM(); validarTabla();
        $(`respuesta-${i}`).focus();
      });
      row.append(UI.el('td', { className: 'row-status' }, UI.el('label', { className: 'check', for: `respuesta-${i}` }, check, 'Respuesta registrada'), UI.el('span', { id: `check${i}` })));
      body.append(row);
    }
    table.append(body); $('tabla').replaceChildren(table); $('matrizPanel').hidden = false;
    $('reglaInfo').textContent = `${d.reglas.modo === 'exactos' ? 'Exactamente' : 'Como máximo'} ${d.reglas.positivos} + y ${d.reglas.negativos} − por respuesta. Grupo: ${d.nombres.length} personas. 0 = no elegida; fila pendiente = dato desconocido.`;
  }
  function validarTabla() {
    if (!proyecto) { $('btnRanking').disabled = true; return; }
    const d = proyecto.datos; let invalidas = 0;
    d.matriz.forEach((row, i) => {
      const p = row.filter(v => v === '+').length, m = row.filter(v => v === '-').length;
      const ok = d.respondidas[i] && p <= d.reglas.positivos && m <= d.reglas.negativos && (d.reglas.modo === 'maximos' || p === d.reglas.positivos && m === d.reglas.negativos);
      if (d.respondidas[i] && !ok) invalidas++;
      const node = $(`check${i}`);
      if (node) { node.textContent = d.respondidas[i] ? `${ok ? '✓' : 'Revisar'}: ${p} + / ${m} −` : 'Pendiente'; node.className = ok ? 'row-valid' : 'row-invalid'; }
    });
    const registradas = d.respondidas.filter(Boolean).length;
    $('progreso').textContent = `${registradas} de ${d.nombres.length} respuestas registradas. ${invalidas} filas registradas por corregir.${configDirty ? ' Aplica la configuración antes de continuar.' : ''}`;
    $('btnRanking').disabled = configDirty || !registradas || invalidas > 0 || (!$('parcial').checked && registradas !== d.nombres.length);
  }
  function leerConfig() {
    const n = Number($('num').value), names = $('names').value;
    const nombres = S.validarNombres($('custom').checked ? (names.includes('\n') ? names.split(/\r?\n/) : names.split(',')) : Array.from({ length: n }, (_, i) => `P${i + 1}`));
    if (nombres.length !== n) throw new Error('La cantidad de participantes no coincide con el número indicado.');
    return { grupo: $('grupo').value, nombres, fecha: $('fecha').value, criterio: $('criterio').value,
      reglas: { positivos: Number($('positivos').value), negativos: Number($('negativos').value), modo: $('modo').value } };
  }
  function crearTabla() {
    try {
      const config = leerConfig(), n = config.nombres.length, actual = proyecto?.datos;
      const iguales = actual && JSON.stringify(config.nombres) === JSON.stringify(actual.nombres) && JSON.stringify(config.reglas) === JSON.stringify(actual.reglas) && config.criterio === actual.criterio;
      const nuevo = S.validarDatos({ ...config, version: 2, cohorte: iguales ? actual.cohorte : crypto.randomUUID(),
        ids: iguales ? actual.ids : Array.from({ length: n }, () => crypto.randomUUID()),
        respondidas: iguales ? actual.respondidas : Array(n).fill(false),
        matriz: iguales ? actual.matriz : Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? '0' : null)) }, { borrador: true });
      if (actual && !iguales && !confirm('Cambiar participantes, pregunta o reglas creará un estudio nuevo y vaciará las respuestas. Exporta antes la copia actual si quieres conservarla. ¿Continuar?')) return;
      proyecto = S.validarProyecto({ datos: nuevo, vista: iguales ? proyecto.vista : {} });
      configDirty = false; limpiarResultados(); cargarConfig(); crearTablaDOM(); guardar(); validarTabla(); actualizarBotones();
      UI.mensaje(iguales ? 'Configuración actualizada. Se han conservado las respuestas.' : 'Matriz creada. Marca cada respuesta registrada y anota sus elecciones.');
    } catch (e) { UI.mensaje(e.message, true); }
  }
  function procesar() {
    limpiarResultados();
    try {
      if (configDirty) throw new Error('Aplica la configuración antes de calcular.');
      const data = S.calcular(proyecto?.datos);
      if (data.metricas.cobertura < 1 && !$('parcial').checked) throw new Error('Faltan respuestas. Regístralas o acepta expresamente un análisis provisional.');
      Graficos.resumen(data, $('resumen')); Graficos.ranking(data, $('ranking'), true);
      $('chart').replaceChildren(Graficos.barras(data, true)); $('resultadosPanel').hidden = false;
      const ok = guardar(); $('btnSociograma').hidden = !ok; $('btnCalor').hidden = !ok;
      UI.mensaje(ok ? 'Resultados actualizados. Puedes abrir el sociograma o el mapa de calor.' : 'Resultados calculados, pero no guardados. Exporta la copia JSON antes de salir.', !ok);
    } catch (e) { UI.mensaje(e.message, true); }
  }
  function exportar(extension) {
    if (!proyecto) return;
    const datos = $('incluirNombres').checked ? proyecto.datos : S.seudonimizar(proyecto.datos);
    const output = extension === 'json' ? JSON.stringify({ ...proyecto, datos, vista: { ...proyecto.vista, seudonimos: true } }, null, 2) : S.aCSV(datos);
    UI.descargar(output, `sociomap-${datos.fecha}.${extension}`, extension === 'json' ? 'application/json' : 'text/csv;charset=utf-8');
  }
  function recuperar() {
    const state = Almacen.leer();
    if (!state.proyecto) { if (state.error) UI.mensaje(state.error, true); return; }
    proyecto = state.proyecto; persistente = state.persistente; $('recordar').checked = persistente;
    cargarConfig(); crearTablaDOM(); actualizarBotones();
    $('parcial').checked = false; validarTabla();
    $('guardado').textContent = persistente ? 'Estudio recuperado del almacenamiento de este navegador.' : 'Estudio recuperado de la sesión temporal.';
    if (state.legado) { UI.mensaje('Estudio de la fase 1 recuperado. Su fecha y criterio no estaban registrados: revísalos antes de exportar o comparar.'); guardar(); }
  }
  $('crearTabla').addEventListener('click', crearTabla); $('btnRanking').addEventListener('click', procesar); $('parcial').addEventListener('change', validarTabla);
  for (const id of ['grupo', 'fecha', 'num', 'modo', 'criterio', 'positivos', 'negativos', 'names', 'custom']) {
    $(id).addEventListener(id === 'num' || id === 'modo' || id === 'custom' ? 'change' : 'input', () => {
      if (id === 'custom') $('namesBox').hidden = !$('custom').checked;
      if (id === 'num') { const max = Number($('num').value) - 1; $('positivos').value = Math.min(Number($('positivos').value), max); $('negativos').value = Math.min(Number($('negativos').value), max - Number($('positivos').value)); }
      if (proyecto) { configDirty = true; limpiarResultados(); validarTabla(); }
    });
  }
  $('recordar').addEventListener('change', () => {
    const before = persistente; persistente = $('recordar').checked;
    if (proyecto && !guardar()) { persistente = before; $('recordar').checked = before; }
  });
  $('borrarDatos').addEventListener('click', () => {
    if (!confirm('Se borrarán el estudio y sus posiciones de la sesión y del almacenamiento de este navegador. Las copias descargadas se borran por separado. ¿Continuar?')) return;
    try { Almacen.borrar(); location.reload(); } catch (e) { UI.mensaje(e.message, true); }
  });
  $('importar').addEventListener('change', async () => {
    const file = $('importar').files[0]; if (!file) return;
    try {
      const incoming = await UI.archivo(file);
      if (proyecto && !confirm('La importación sustituirá el estudio abierto. ¿Continuar?')) return;
      proyecto = incoming; configDirty = false; limpiarResultados(); cargarConfig(); crearTablaDOM(); actualizarBotones(); guardar();
      $('parcial').checked = false; validarTabla(); UI.mensaje('Estudio importado. Revisa la configuración y las respuestas antes de analizar.');
    } catch (e) { UI.mensaje('No se ha importado el archivo. ' + e.message, true); }
    finally { $('importar').value = ''; }
  });
  $('copiaJSON').addEventListener('click', () => exportar('json')); $('copiaCSV').addEventListener('click', () => exportar('csv'));
  $('nuevaMedicion').addEventListener('click', () => {
    if (!proyecto || !confirm('Se vaciarán las respuestas conservando grupo e identificadores. Exporta antes la medición actual para poder compararla. ¿Continuar?')) return;
    const d = proyecto.datos, n = d.nombres.length;
    d.respondidas = Array(n).fill(false); d.matriz = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? '0' : null));
    d.fecha = UI.hoy(); d.fechaNoRegistrada = false; limpiarResultados(); cargarConfig(); crearTablaDOM(); guardar(); validarTabla();
    UI.mensaje('Nueva medición preparada. Comprueba la fecha y registra las nuevas respuestas.'); $('fecha').focus();
  });
  window.addEventListener('pageshow', e => { if (restored && e.persisted) { limpiarResultados(); recuperar(); } restored = true; });
  window.addEventListener('storage', e => { if ([S.STORAGE_KEY, null].includes(e.key)) { proyecto = null; location.reload(); } });
  recuperar();
})();
