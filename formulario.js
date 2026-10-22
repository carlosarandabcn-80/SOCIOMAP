'use strict';
(() => {
  const S = Sociometria;
  const $ = id => document.getElementById(id);
  const LIMITE = 3;
  let proyecto = null;
  let indice = 0;
  let configuracionPendiente = false;
  let hayEstudioAnterior = false;
  for (let n = 7; n <= 40; n++) $('num').add(new Option(n, n));
  $('num').value = '7';
  $('fecha').value = UI.hoy();

  function mensaje(texto, error) { UI.mensaje(texto, Boolean(error)); }
  function guardar() {
    try {
      Almacen.guardar(proyecto, false);
      return true;
    } catch (e) {
      mensaje('No se pueden guardar los datos en esta pestaña: ' + e.message, true);
      return false;
    }
  }
  function ocultarResultados() {
    $('resultadosPanel').hidden = true;
    $('btnSociograma').hidden = true;
  }
  function esCompatible(datos) {
    return datos.nombres.length >= 7 && datos.reglas.modo === 'exactos' &&
      datos.reglas.positivos === LIMITE && datos.reglas.negativos === LIMITE;
  }
  function cargarConfig() {
    const d = proyecto.datos;
    $('grupo').value = d.grupo;
    $('num').value = String(d.nombres.length);
    $('fecha').value = d.fechaNoRegistrada ? UI.hoy() : d.fecha;
    $('criterio').value = d.criterio;
    $('custom').checked = d.nombres.some((nombre, i) => nombre !== 'P' + (i + 1));
    $('namesBox').hidden = !$('custom').checked;
    $('names').value = d.nombres.join('\n');
    if ($('custom').checked) $('custom').closest('details').open = true;
    configuracionPendiente = false;
  }
  function leerConfig() {
    const n = Number($('num').value);
    if (!Number.isInteger(n) || n < 7 || n > 40) throw new Error('El grupo necesita entre 7 y 40 personas para permitir seis elecciones distintas.');
    let nombres = Array.from({ length: n }, (_, i) => 'P' + (i + 1));
    if ($('custom').checked) {
      const entrada = $('names').value.trim();
      nombres = S.validarNombres(entrada.includes('\n') ? entrada.split(/\r?\n/) : entrada.split(','));
      if (nombres.length !== n) throw new Error('Escribe exactamente ' + n + ' nombres o desmarca la opción de nombres.');
    }
    return {
      grupo: $('grupo').value, nombres, fecha: $('fecha').value, criterio: $('criterio').value,
      reglas: { positivos: LIMITE, negativos: LIMITE, modo: 'exactos' }
    };
  }
  function crearGrupo() {
    try {
      const cfg = leerConfig();
      const prev = proyecto && proyecto.datos;
      const igual = prev && JSON.stringify(prev.nombres) === JSON.stringify(cfg.nombres) &&
        prev.criterio === cfg.criterio && esCompatible(prev);
      if ((prev && !igual || hayEstudioAnterior) &&
          !confirm('Se sustituirán las respuestas guardadas. ¿Crear este grupo?')) return;
      const n = cfg.nombres.length;
      const datos = S.validarDatos(Object.assign({}, cfg, {
        version: 2,
        cohorte: igual ? prev.cohorte : crypto.randomUUID(),
        ids: igual ? prev.ids : Array.from({ length: n }, () => crypto.randomUUID()),
        respondidas: igual ? prev.respondidas : Array(n).fill(false),
        matriz: igual ? prev.matriz : Array.from({ length: n }, (_, i) =>
          Array.from({ length: n }, (_, j) => i === j ? '0' : null))
      }), { borrador: true });
      proyecto = S.validarProyecto({ datos, vista: igual ? proyecto.vista : {} });
      hayEstudioAnterior = false;
      indice = 0;
      cargarConfig();
      ocultarResultados();
      $('matrizPanel').hidden = false;
      dibujarPersona();
      validar();
      guardar();
      mensaje(igual ? 'Grupo actualizado. Se han conservado las elecciones.' : 'Grupo creado. Empieza por la primera persona.');
      $('matrizPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) { mensaje(e.message, true); }
  }
  function votosDe(signo, i) {
    return proyecto.datos.matriz[i].flatMap((v, j) => v === signo ? [j] : []);
  }
  function selector(signo, slot, elegidos) {
    const d = proyecto.datos;
    const label = (signo === '+' ? 'Positiva ' : 'Negativa ') + (slot + 1);
    const sel = UI.el('select', {
      className: 'vote-select', 'data-sign': signo, 'data-slot': slot,
      'aria-label': label + ' de ' + d.nombres[indice]
    });
    sel.append(UI.el('option', { value: '' }, 'Selecciona una persona'));
    for (let j = 0; j < d.nombres.length; j++) {
      if (j === indice) continue;
      sel.append(UI.el('option', { value: j }, d.nombres[j]));
    }
    sel.value = elegidos[slot] === undefined ? '' : String(elegidos[slot]);
    sel.addEventListener('change', cambiarVoto);
    return UI.el('label', { className: 'vote-field' }, UI.el('span', {}, String(slot + 1)), sel);
  }
  function refrescarOpciones() {
    const selects = Array.from($('votacion').querySelectorAll('.vote-select'));
    const usadas = selects.map(sel => sel.value).filter(v => v !== '');
    for (const sel of selects) {
      for (const option of sel.options) {
        if (option.value !== '') option.disabled = usadas.includes(option.value) && option.value !== sel.value;
      }
    }
  }
  function cambiarVoto(e) {
    const selects = Array.from($('votacion').querySelectorAll('.vote-select'));
    const usadas = selects.map(sel => sel.value).filter(Boolean);
    if (new Set(usadas).size !== usadas.length) {
      e.target.value = '';
      refrescarOpciones();
      mensaje('Cada persona solo puede aparecer una vez.', true);
      return;
    }
    const d = proyecto.datos, i = indice;
    const completo = usadas.length > 0;
    d.respondidas[i] = completo;
    d.matriz[i] = Array.from({ length: d.nombres.length }, (_, j) => i === j || completo ? '0' : null);
    for (const sel of selects) {
      if (sel.value !== '') d.matriz[i][Number(sel.value)] = sel.dataset.sign;
    }
    ocultarResultados();
    refrescarOpciones();
    validar();
    guardar();
    mensaje('');
  }
  function dibujarPersona() {
    if (!proyecto) return;
    const d = proyecto.datos, nombre = d.nombres[indice];
    const positivos = votosDe('+', indice).slice(0, LIMITE);
    const negativos = votosDe('-', indice).slice(0, LIMITE);
    const card = UI.el('div', { className: 'person-card' },
      UI.el('div', { className: 'person-title' },
        UI.el('div', {}, UI.el('span', { className: 'eyebrow' }, 'Persona ' + (indice + 1) + ' de ' + d.nombres.length),
          UI.el('h3', {}, nombre)),
        UI.el('span', { className: 'person-state', id: 'estadoPersona' }, '')
      ),
      UI.el('div', { className: 'choice-grid' },
        UI.el('fieldset', { className: 'choice-group positive-choice' },
          UI.el('legend', {}, '＋ 3 positivas'), UI.el('p', { className: 'hint' }, 'Con quién prefiere participar.'),
          [0, 1, 2].map(slot => selector('+', slot, positivos))),
        UI.el('fieldset', { className: 'choice-group negative-choice' },
          UI.el('legend', {}, '− 3 negativas'), UI.el('p', { className: 'hint' }, 'Con quién prefiere menos participar.'),
          [0, 1, 2].map(slot => selector('-', slot, negativos)))
      )
    );
    $('votacion').replaceChildren(card);
    $('anterior').disabled = indice === 0;
    $('siguiente').disabled = indice === d.nombres.length - 1;
    refrescarOpciones();
    pintarNavegacion();
  }
  function completada(i) {
    const d = proyecto.datos;
    return d.respondidas[i] && votosDe('+', i).length === LIMITE && votosDe('-', i).length === LIMITE;
  }
  function pintarNavegacion() {
    if (!proyecto) return;
    const d = proyecto.datos;
    $('pasos').replaceChildren(...d.nombres.map((nombre, i) => {
      const boton = UI.el('button', {
        type: 'button', className: 'person-pill' + (indice === i ? ' active' : '') + (completada(i) ? ' done' : ''),
        'aria-label': 'Persona ' + (i + 1) + ': ' + nombre + (completada(i) ? ', completa' : ', pendiente'),
        'aria-current': indice === i ? 'step' : null
      }, String(i + 1));
      boton.addEventListener('click', () => { indice = i; dibujarPersona(); });
      return boton;
    }));
    const p = votosDe('+', indice).length, m = votosDe('-', indice).length;
    const estado = $('estadoPersona');
    if (estado) {
      estado.textContent = completada(indice) ? 'Completa ✓' : p + '/3 positivas · ' + m + '/3 negativas';
      estado.classList.toggle('is-done', completada(indice));
    }
  }
  function validar() {
    if (!proyecto) return;
    const n = proyecto.datos.nombres.length;
    const completadas = proyecto.datos.nombres.filter((_, i) => completada(i)).length;
    const porcentaje = Math.round(100 * completadas / n);
    $('progreso').textContent = completadas + ' de ' + n + ' personas completas';
    $('barraProgreso').setAttribute('aria-valuenow', String(porcentaje));
    $('barraRelleno').style.width = porcentaje + '%';
    $('btnRanking').disabled = completadas !== n || configuracionPendiente;
    pintarNavegacion();
  }
  function resultados() {
    ocultarResultados();
    try {
      if ($('btnRanking').disabled) throw new Error('Completa las seis elecciones de todas las personas.');
      const data = S.calcular(proyecto.datos), m = data.metricas;
      $('resumen').replaceChildren(UI.el('div', { className: 'metrics' },
        [[m.participantes, 'Personas'], [m.totalPos, 'Positivas'], [m.totalNeg, 'Negativas'],
          [m.paresMutPos, 'Pares positivos recíprocos']].map(([num, titulo]) =>
          UI.el('div', { className: 'metric' }, UI.el('strong', {}, num), UI.el('span', {}, titulo)))));
      $('ranking').replaceChildren(UI.tabla(['Persona', '+ recibidas', '− recibidas'],
        data.nodes.map(v => ['P' + (v.id + 1), v.recPos, v.recNeg]), 'Elecciones recibidas. Códigos por privacidad.'));
      $('resultadosPanel').hidden = false;
      const ok = guardar();
      $('btnSociograma').hidden = !ok;
      if (!ok) mensaje('Resultados calculados, pero no se han podido guardar para abrir los mapas.', true);
      else mensaje('Resultados listos.');
      $('resultadosPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) { mensaje(e.message, true); }
  }
  function recuperar() {
    const state = Almacen.leer();
    if (!state.proyecto) {
      if (state.error) mensaje(state.error, true);
      return;
    }
    if (!esCompatible(state.proyecto.datos)) {
      hayEstudioAnterior = true;
      mensaje('Los datos anteriores usan otras reglas. Crea un grupo nuevo para registrar 3 positivas y 3 negativas por persona.', true);
      return;
    }
    proyecto = state.proyecto;
    cargarConfig();
    $('matrizPanel').hidden = false;
    dibujarPersona();
    validar();
  }
  $('crearTabla').addEventListener('click', crearGrupo);
  $('btnRanking').addEventListener('click', resultados);
  $('anterior').addEventListener('click', () => { if (indice > 0) { indice--; dibujarPersona(); } });
  $('siguiente').addEventListener('click', () => {
    if (proyecto && indice < proyecto.datos.nombres.length - 1) { indice++; dibujarPersona(); }
  });
  $('custom').addEventListener('change', () => { $('namesBox').hidden = !$('custom').checked; });
  for (const id of ['grupo', 'num', 'fecha', 'criterio', 'names', 'custom']) {
    $(id).addEventListener('change', () => {
      if (proyecto) { configuracionPendiente = true; ocultarResultados(); validar(); }
    });
  }
  $('borrarDatos').addEventListener('click', () => {
    if (!confirm('Se borrarán las respuestas guardadas en este navegador. ¿Continuar?')) return;
    try { Almacen.borrar(); location.reload(); }
    catch (e) { mensaje(e.message, true); }
  });
  window.addEventListener('pageshow', e => { if (e.persisted) { ocultarResultados(); recuperar(); } });
  window.addEventListener('storage', e => { if ([S.STORAGE_KEY, null].includes(e.key)) location.reload(); });
  recuperar();
})();