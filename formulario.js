'use strict';
(() => {
  const S = Sociometria;
  const $ = id => document.getElementById(id);
  const LIMITE = 3;
  let proyecto = null;
  let persistente = false;
  let indice = 0;
  let configuracionPendiente = false;
  let hayEstudioAnterior = false;
  let lecturaCopia = 0;
  const fotosPendientes = new Map();
  for (let n = 7; n <= 40; n++) $('num').add(new Option(n, n));
  $('num').value = '7';
  $('fecha').value = UI.hoy();

  function mensaje(texto, error) { UI.mensaje(texto, Boolean(error)); }
  function mensajeFicha(texto, error) { UI.mensaje(texto, Boolean(error), 'mensajeFicha'); }
  function guardar(candidato, recordar = persistente) {
    proyecto = Almacen.guardar(candidato, recordar);
    persistente = recordar;
  }
  function ocultarResultados() {
    $('verFotosResumen').checked = false;
    $('resultadosPanel').hidden = true;
    $('btnSociograma').hidden = true;
  }
  function esCompatible(datos) {
    return datos.nombres.length >= 7 && datos.reglas.modo === 'exactos' &&
      datos.reglas.positivos === LIMITE && datos.reglas.negativos === LIMITE;
  }
  const nombresPersonalizados = nombres => nombres.some((nombre, i) => nombre !== 'P' + (i + 1));
  function cargarNombres(nombres) {
    $('custom').checked = nombresPersonalizados(nombres);
    $('namesBox').hidden = !$('custom').checked;
    $('names').value = nombres.join('\n');
  }
  function cargarConfig(d) {
    $('grupo').value = d.grupo;
    $('num').value = String(d.nombres.length);
    $('fecha').value = d.fechaNoRegistrada ? UI.hoy() : d.fecha;
    $('criterio').value = d.criterio;
    cargarNombres(d.nombres);
    if ($('custom').checked) $('custom').closest('details').open = true;
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
  function mismoGrupo(a, b) {
    return a.grupo === b.grupo && a.criterio === b.criterio &&
      a.nombres.length === b.nombres.length && a.nombres.every((nombre, i) => nombre === b.nombres[i]);
  }
  function activar(nuevo, recordar) {
    proyecto = nuevo;
    persistente = recordar;
    hayEstudioAnterior = false;
    configuracionPendiente = false;
    fotosPendientes.clear();
    indice = 0;
    cargarConfig(proyecto.datos);
    ocultarResultados();
    mensajeFicha('');
    $('matrizPanel').hidden = false;
    $('guardarCopia').disabled = false;
    dibujarPersona();
    validar();
  }
  function crearGrupo() {
    try {
      const cfg = leerConfig();
      const prev = proyecto?.datos, n = cfg.nombres.length;
      const datos = S.validarDatos(Object.assign({}, cfg, {
        version: 2, cohorte: crypto.randomUUID(),
        ids: Array.from({ length: n }, () => crypto.randomUUID()),
        respondidas: Array(n).fill(false),
        matriz: Array.from({ length: n }, (_, i) =>
          Array.from({ length: n }, (_, j) => i === j ? '0' : null))
      }), { borrador: true });
      const mismo = prev && mismoGrupo(prev, datos);
      if (mismo && !prev.fechaNoRegistrada) {
        if (prev.fecha !== datos.fecha)
          throw new Error('La fecha ha cambiado. Usa «Guardar medición actual e iniciar otra fecha» para conservar las identidades y empezar con las respuestas vacías.');
        configuracionPendiente = false;
        cargarConfig(prev);
        ocultarResultados();
        validar();
        mensaje('Grupo recuperado con sus respuestas y fotografías.');
      } else {
        if ((prev || hayEstudioAnterior) &&
            !confirm('Crear otro grupo sustituye el estudio activo, con sus respuestas y fotos. ¿Continuar?')) return;
        guardar({ datos }, false);
        activar(proyecto, persistente);
        mensaje('Grupo creado. Empieza por la primera persona.');
      }
      UI.desplazar($('matrizPanel'));
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
      mensajeFicha('Cada persona solo puede aparecer una vez.', true);
      return;
    }
    const d = proyecto.datos, i = indice;
    const registrada = usadas.length > 0, respondidas = [...d.respondidas], matriz = [...d.matriz];
    respondidas[i] = registrada;
    matriz[i] = Array.from({ length: d.nombres.length }, (_, j) => i === j || registrada ? '0' : null);
    for (const sel of selects) {
      if (sel.value !== '') matriz[i][Number(sel.value)] = sel.dataset.sign;
    }
    try {
      guardar({ ...proyecto, datos: { ...d, respondidas, matriz } });
      ocultarResultados();
      refrescarOpciones();
      pintarNavegacion();
      validar();
      mensajeFicha('');
    } catch (error) {
      const foco = `[data-sign="${e.target.dataset.sign}"][data-slot="${e.target.dataset.slot}"]`;
      dibujarPersona();
      $('votacion').querySelector(foco)?.focus({ preventScroll: true });
      mensajeFicha('No se guardó el cambio en la respuesta. ' + error.message, true);
    }
  }
  function guardarNombre(event) {
    event.preventDefault();
    const d = proyecto.datos, input = $('nombreParticipante'), nombres = [...d.nombres];
    const codigo = 'P' + (indice + 1);
    try {
      nombres[indice] = input.value.trim() ? S.normalizarNombre(input.value) : codigo;
      if (nombres[indice] !== d.nombres[indice]) {
        guardar({ ...proyecto, datos: { ...d, nombres } });
        if ($('names').value === d.nombres.join('\n') && $('custom').checked === nombresPersonalizados(d.nombres))
          cargarNombres(proyecto.datos.nombres);
        ocultarResultados();
        dibujarPersona();
        $('nombreParticipante').focus({ preventScroll: true });
      }
      mensajeFicha(nombres[indice] === codigo ? 'Código ' + codigo + ' guardado.' : 'Nombre guardado. Sus respuestas se conservan.');
    } catch (error) { mensajeFicha(error.message, true); }
  }
  function actualizarFoto(uid) {
    pintarNavegacion();
    const d = proyecto.datos;
    if (d.ids[indice] !== uid) return;
    const editor = $('editorFoto');
    editor.querySelector('.avatar-editor').replaceWith(FotosUI.avatar(d, indice, false, 'avatar-editor'));
    $('quitarFoto').disabled = !d.fotos[uid];
    editor.setAttribute('aria-busy', String(fotosPendientes.has(uid)));
  }
  async function cargarFoto(event, uid) {
    const input = event.currentTarget, file = input.files?.[0];
    if (!file) return;
    const carga = Symbol();
    fotosPendientes.set(uid, carga);
    $('editorFoto').setAttribute('aria-busy', 'true');
    mensajeFicha('Preparando la fotografía…');
    try {
      const miniatura = await FotosUI.procesar(file);
      if (fotosPendientes.get(uid) !== carga) return;
      const d = proyecto.datos;
      guardar({ ...proyecto, datos: { ...d, fotos: { ...d.fotos, [uid]: miniatura } } });
      ocultarResultados();
      mensajeFicha('Fotografía de P' + (d.ids.indexOf(uid) + 1) + ' guardada en este navegador.');
    } catch (error) {
      if (fotosPendientes.get(uid) === carga) mensajeFicha('No se guardó la fotografía. ' + error.message, true);
    } finally {
      if (fotosPendientes.get(uid) === carga) {
        fotosPendientes.delete(uid);
        actualizarFoto(uid);
        input.value = '';
      }
    }
  }
  function retirarFoto(uid) {
    const d = proyecto.datos, fotos = { ...d.fotos };
    delete fotos[uid];
    try {
      guardar({ ...proyecto, datos: { ...d, fotos } });
      fotosPendientes.delete(uid);
      ocultarResultados();
      actualizarFoto(uid);
      $('fotoParticipante').value = '';
      $('fotoParticipante').focus({ preventScroll: true });
      mensajeFicha('Fotografía retirada del estudio.');
    } catch (error) { mensajeFicha('No se retiró la fotografía. ' + error.message, true); }
  }
  function dibujarPersona() {
    if (!proyecto) return;
    const d = proyecto.datos, nombre = d.nombres[indice];
    const positivos = votosDe('+', indice).slice(0, LIMITE);
    const negativos = votosDe('-', indice).slice(0, LIMITE), uid = d.ids[indice];
    const codigo = 'P' + (indice + 1);
    const campoNombre = UI.el('input', { id: 'nombreParticipante', maxlength: 80,
      value: nombre === codigo ? '' : nombre, placeholder: codigo, autocomplete: 'off', 'aria-describedby': 'ayudaNombre' });
    const editorNombre = UI.el('form', { className: 'editor-nombre' },
      UI.el('label', { for: 'nombreParticipante' }, 'Nombre o alias (opcional)'),
      UI.el('div', { className: 'nombre-acciones' }, campoNombre, UI.el('button', { className: 'btn', type: 'submit' }, 'Guardar nombre')),
      UI.el('p', { className: 'hint', id: 'ayudaNombre' }, 'Deja el campo vacío para usar ' + codigo + '.'));
    editorNombre.addEventListener('submit', guardarNombre);
    const inputFoto = UI.el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp',
      id: 'fotoParticipante', className: 'foto-input', 'aria-describedby': 'ayudaFoto' });
    inputFoto.addEventListener('change', event => cargarFoto(event, uid));
    const quitar = UI.el('button', { type: 'button', className: 'btn foto-quitar', id: 'quitarFoto', disabled: !d.fotos[uid] }, 'Retirar foto');
    quitar.addEventListener('click', () => retirarFoto(uid));
    const editorFoto = UI.el('div', { className: 'editor-foto', id: 'editorFoto', 'aria-busy': String(fotosPendientes.has(uid)) },
      FotosUI.avatar(d, indice, false, 'avatar-editor'),
      UI.el('div', { className: 'campo-foto' },
        UI.el('label', { for: 'fotoParticipante' }, 'Fotografía (opcional)'),
        UI.el('div', { className: 'foto-acciones' }, inputFoto, quitar),
        UI.el('p', { className: 'hint', id: 'ayudaFoto' }, 'JPG, PNG o WebP · Hasta 6 MB. Se guarda una miniatura local.')
      ));
    const card = UI.el('div', { className: 'person-card' },
      UI.el('div', { className: 'person-title' },
        UI.el('div', {}, UI.el('span', { className: 'eyebrow' }, 'Persona ' + (indice + 1) + ' de ' + d.nombres.length),
          UI.el('h3', {}, nombre)),
        UI.el('span', { className: 'person-state', id: 'estadoPersona' }, '')
      ),
      UI.el('div', { className: 'editor-perfil' }, editorNombre, editorFoto),
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
    return S.respuestaCompleta(proyecto.datos, i);
  }
  function pintarNavegacion() {
    if (!proyecto) return;
    const d = proyecto.datos;
    const pasos = $('pasos'), focused = Array.from(pasos.children).indexOf(document.activeElement);
    pasos.replaceChildren(...d.nombres.map((nombre, i) => {
      const boton = UI.el('button', {
        type: 'button', className: 'person-pill' + (indice === i ? ' active' : '') + (completada(i) ? ' done' : ''),
        'aria-label': 'Persona ' + (i + 1) + ': ' + nombre + (completada(i) ? ', completa' : ', pendiente'),
        'aria-current': indice === i ? 'step' : null
      }, FotosUI.avatar(d,i,false,'avatar-paso'), UI.el('span', { 'aria-hidden': 'true' },
        String(i + 1) + (completada(i) ? ' ✓' : '')));
      boton.addEventListener('click', () => { indice = i; mensajeFicha(''); dibujarPersona(); });
      return boton;
    }));
    if (focused >= 0) pasos.children[focused]?.focus({ preventScroll: true });
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
    $('nuevaMedicion').disabled = completadas !== n || proyecto.datos.fechaNoRegistrada;
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
      const dibujarRanking = () => $('ranking').replaceChildren(UI.tabla(['Persona', '+ recibidas', '− recibidas'],
        UI.ordenarElecciones(data.nodes).map(v => [FotosUI.persona(data, v.id, !$('verFotosResumen').checked), v.recPos, v.recNeg]),
        'Orden por elecciones positivas recibidas. Los empates siguen el orden de registro.'));
      dibujarRanking();
      $('verFotosResumen').onchange=dibujarRanking;
      $('resultadosPanel').hidden = false;
      $('btnSociograma').hidden = false;
      mensaje('Resultados listos.');
      UI.desplazar($('resultadosPanel'));
    } catch (e) { mensaje(e.message, true); }
  }
  function recuperar() {
    const state = Almacen.leer();
    if (!state.proyecto) {
      hayEstudioAnterior = state.error?.startsWith('No se pudo recuperar el estudio:') ?? false;
      if (state.error) mensaje(state.error, true);
      return;
    }
    if (!esCompatible(state.proyecto.datos)) {
      hayEstudioAnterior = true;
      mensaje('Los datos anteriores usan otras reglas. Crea un grupo nuevo para registrar 3 positivas y 3 negativas por persona.', true);
      return;
    }
    activar(state.proyecto, state.persistente);
  }
  $('guardarCopia').addEventListener('click', () => {
    if (!proyecto) return;
    const copia = S.validarProyecto({ ...proyecto, vista: { ...proyecto.vista, seudonimos: true } });
    UI.descargar(JSON.stringify(copia, null, 2), 'sociomap-copia-' + copia.datos.fecha + '.json', 'application/json');
    mensaje('Copia privada preparada. Comprueba la descarga y conserva el archivo de forma confidencial.');
  });
  $('restaurarCopia').addEventListener('change', async event => {
    const input = event.currentTarget, file = input.files[0];
    if (!file) return;
    const lectura = ++lecturaCopia, anterior = proyecto;
    try {
      if (!/\.json$/i.test(file.name)) throw new Error('Selecciona una copia JSON de SOCIOMAP.');
      const copia = await UI.archivo(file);
      if (lectura !== lecturaCopia) return;
      if (proyecto !== anterior) throw new Error('El estudio activo cambió durante la lectura. Vuelve a seleccionar la copia.');
      if (!esCompatible(copia.datos)) throw new Error('La copia debe corresponder a un grupo de 7 a 40 personas con 3 positivas y 3 negativas exactas.');
      if ((proyecto || hayEstudioAnterior) && !confirm('Restaurar «' + copia.datos.grupo + '» sustituirá el estudio activo, con sus respuestas y fotos. ¿Continuar?')) return;
      copia.vista.seudonimos = true;
      guardar(copia, false);
      activar(proyecto, persistente);
      mensaje('Copia restaurada en esta pestaña.');
    } catch (error) {
      if (lectura === lecturaCopia) mensaje('No se restauró la copia. ' + error.message, true);
    } finally {
      if (lectura === lecturaCopia) input.value = '';
    }
  });
  $('descargarCuestionarios').addEventListener('click', async () => {
    const boton = $('descargarCuestionarios');
    try {
      boton.disabled = true;
      boton.textContent = 'Preparando PDF…';
      await CuestionarioPDF.descargar();
      mensaje('PDF descargado: un A4 con dos papeletas independientes y línea de corte.');
    } catch (e) {
      mensaje('No se ha podido crear el cuestionario: ' + e.message, true);
    } finally {
      boton.disabled = false;
      boton.textContent = 'Descargar plantilla PDF (2 por A4)';
    }
  });
  function iniciarNuevaMedicion() {
    try {
      if (!proyecto) throw new Error('Crea primero un estudio y completa su recogida.');
      const anterior = proyecto.datos, cfg = leerConfig();
      if (!mismoGrupo(cfg, anterior))
        throw new Error('Para una nueva medición deben mantenerse el grupo, los nombres y la pregunta. Modifica únicamente la fecha.');
      const siguientes = S.nuevaMedicion(anterior, cfg.fecha);
      if (!confirm('Se descargará una copia JSON con los nombres, las fotos y las elecciones de ' + anterior.fecha +
          '. Debes comprobar y conservar ese archivo de forma confidencial: el navegador no puede garantizar que se guarde. ¿Iniciar una nueva medición con las respuestas vacías?')) return;
      const respaldo = S.validarProyecto({ ...proyecto, vista: { ...proyecto.vista, seudonimos: true } });
      UI.descargar(JSON.stringify(respaldo, null, 2), 'sociomap-medicion-' + anterior.fecha + '.json', 'application/json');
      guardar({ datos: siguientes });
      activar(proyecto, persistente);
      mensaje('Medición ' + cfg.fecha + ' creada con todas las respuestas pendientes. Comprueba la descarga de la medición anterior (' + anterior.fecha + ') antes de continuar.');
      UI.desplazar($('matrizPanel'));
    } catch (e) { mensaje('No se ha iniciado una nueva medición. ' + e.message, true); }
  }
  $('nuevaMedicion').addEventListener('click', iniciarNuevaMedicion);
  $('crearTabla').addEventListener('click', crearGrupo);
  $('btnRanking').addEventListener('click', resultados);
  $('anterior').addEventListener('click', () => { if (indice > 0) { indice--; mensajeFicha(''); dibujarPersona(); } });
  $('siguiente').addEventListener('click', () => {
    if (proyecto && indice < proyecto.datos.nombres.length - 1) { indice++; mensajeFicha(''); dibujarPersona(); }
  });
  $('custom').addEventListener('change', () => { $('namesBox').hidden = !$('custom').checked; });
  for (const id of ['grupo', 'num', 'fecha', 'criterio', 'names', 'custom']) {
    $(id).addEventListener('input', () => {
      if (proyecto) { configuracionPendiente = true; ocultarResultados(); validar(); }
    });
  }
  $('borrarDatos').addEventListener('click', () => {
    if (!confirm('Se borrarán las respuestas guardadas en este navegador. ¿Continuar?')) return;
    try { Almacen.borrar(); location.reload(); }
    catch (e) { mensaje(e.message, true); }
  });
  window.addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
  window.addEventListener('storage', e => { if ([S.STORAGE_KEY, null].includes(e.key)) location.reload(); });
  recuperar();
  try{
    const raw=sessionStorage.getItem('sociomap.config.pendiente');
    if(raw){
      sessionStorage.removeItem('sociomap.config.pendiente');
      const cfg=JSON.parse(raw);
      cargarConfig(cfg);
      if (!proyecto && !hayEstudioAnterior) crearGrupo();
      else if (proyecto && mismoGrupo(proyecto.datos, cfg) &&
               (proyecto.datos.fecha === cfg.fecha || proyecto.datos.fechaNoRegistrada)) {
        cargarConfig(proyecto.datos);
        mensaje('Has recuperado el estudio guardado en este navegador.');
      } else {
        configuracionPendiente = true;
        validar();
        mensaje('Hay un estudio guardado. Revisa la configuración nueva antes de aplicarla o recarga para continuar el estudio anterior.');
      }
    }
  }catch(e){UI.mensaje('No se pudo trasladar la configuración: '+e.message,true);}
})();
