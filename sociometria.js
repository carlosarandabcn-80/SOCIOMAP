(function (root) {
  'use strict';
  const STORAGE_KEY = 'sociomap.proyecto.v2', MAX_FILE = 1024 * 1024;
  const fail = message => { throw new Error(message); };
  function texto(value, label, max = 200) {
    if (typeof value !== 'string') fail(`${label}: se requiere texto.`);
    const normalized = value.normalize('NFC').trim().replace(/\s+/g, ' ');
    if (!normalized || normalized.length > max || /[\u0000-\u001f\u007f]/.test(value)) fail(`${label}: texto vacío, demasiado largo o con caracteres de control.`);
    return normalized;
  }
  const normalizarNombre = value => texto(value, 'Nombre', 80);
  function validarNombres(names) {
    if (!Array.isArray(names) || names.length < 2 || names.length > 40) fail('El grupo debe tener entre 2 y 40 participantes.');
    const result = Array.from(names, normalizarNombre);
    if (new Set(result.map(n => n.toLocaleLowerCase('es'))).size !== result.length) fail('No se permiten nombres duplicados, tampoco con distintas mayúsculas o espacios.');
    return result;
  }
  function hash(text) {
    let h = 2166136261;
    for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return (h >>> 0).toString(16);
  }
  function migrar(data) {
    if (data?.version !== 1) return data;
    return { ...data, version: 2, cohorte: 'legacy-' + hash(JSON.stringify([data.grupo, data.nombres])),
      ids: Array.from(data.nombres || [], (_, i) => `p${i + 1}`), fecha: '2000-01-01', fechaNoRegistrada: true,
      criterio: 'Afinidad (formato anterior, criterio no registrado)', reglas: { positivos: 3, negativos: 3, modo: 'exactos' },
      respondidas: Array.from(data.nombres || [], () => true) };
  }
  function validarDatos(input, { borrador = false } = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail('No hay un proyecto válido.');
    const data = migrar(input);
    if (data.version !== 2) fail('Versión no compatible. Importa un archivo de SOCIOMAP.');
    const grupo = texto(data.grupo, 'Grupo'), nombres = validarNombres(data.nombres), n = nombres.length;
    const cohorte = texto(data.cohorte, 'Identificador del estudio', 160);
    if (!Array.isArray(data.ids) || data.ids.length !== n) fail('Faltan identificadores de participantes.');
    const ids = Array.from(data.ids, id => {
      if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(id) || ['__proto__', 'constructor', 'prototype'].includes(id)) fail('Identificador de participante inválido.');
      return id;
    });
    if (new Set(ids).size !== n) fail('Hay identificadores duplicados.');
    if (typeof data.fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.fecha) || !Number.isFinite(Date.parse(data.fecha)) || new Date(data.fecha).toISOString().slice(0, 10) !== data.fecha) fail('La fecha no es válida.');
    const criterio = texto(data.criterio, 'Criterio', 400), r = data.reglas;
    if (!r || !['exactos', 'maximos'].includes(r.modo) || !Number.isInteger(r.positivos) || !Number.isInteger(r.negativos) || r.positivos < 1 || r.negativos < 0 || r.positivos + r.negativos > n - 1) fail('Los límites de elección deben caber entre los demás participantes (al menos un positivo permitido).');
    const reglas = { positivos: r.positivos, negativos: r.negativos, modo: r.modo };
    if (!Array.isArray(data.respondidas) || data.respondidas.length !== n || Array.from(data.respondidas).some(v => typeof v !== 'boolean')) fail('El estado de las respuestas está incompleto.');
    const respondidas = [...data.respondidas];
    if (!Array.isArray(data.matriz) || data.matriz.length !== n) fail('La matriz está incompleta.');
    const matriz = Array.from(data.matriz, (row, i) => {
      if (!Array.isArray(row) || row.length !== n) fail('La matriz está incompleta.');
      const values = Array.from(row, (v, j) => {
        if (i === j) { if (v !== '0') fail('No se permiten autovotos.'); }
        else if (respondidas[i] ? !['0', '+', '-'].includes(v) : v !== null) fail(`La fila de ${nombres[i]} contiene votos inválidos o confunde ausencia de respuesta con cero elecciones.`);
        return v;
      });
      if (!borrador && respondidas[i]) {
        const p = values.filter(v => v === '+').length, m = values.filter(v => v === '-').length;
        if ((r.modo === 'exactos' && (p !== r.positivos || m !== r.negativos)) || p > r.positivos || m > r.negativos) fail(`La fila de ${nombres[i]} debe tener ${r.modo === 'exactos' ? 'exactamente' : 'como máximo'} ${r.positivos} + y ${r.negativos} − (ahora ${p} + y ${m} −).`);
      }
      return values;
    });
    return { version: 2, cohorte, grupo, nombres, ids, fecha: data.fecha, fechaNoRegistrada: data.fechaNoRegistrada === true, criterio, reglas, respondidas, matriz };
  }
  function intermediacion(adj) {
    const n = adj.length, cb = Array(n).fill(0);
    for (let s = 0; s < n; s++) {
      const stack = [], pred = Array.from({ length: n }, () => []), sigma = Array(n).fill(0), dist = Array(n).fill(-1), queue = [s];
      sigma[s] = 1; dist[s] = 0;
      for (let head = 0; head < queue.length; head++) {
        const v = queue[head]; stack.push(v);
        for (const w of adj[v]) {
          if (dist[w] < 0) { queue.push(w); dist[w] = dist[v] + 1; }
          if (dist[w] === dist[v] + 1) { sigma[w] += sigma[v]; pred[w].push(v); }
        }
      }
      const delta = Array(n).fill(0);
      while (stack.length) {
        const w = stack.pop();
        for (const v of pred[w]) delta[v] += sigma[v] / sigma[w] * (1 + delta[w]);
        if (w !== s) cb[w] += delta[w];
      }
    }
    return cb.map(v => n > 2 ? v / ((n - 1) * (n - 2)) : 0);
  }
  function componentes(adj) {
    const seen = new Set(), groups = [];
    for (let i = 0; i < adj.length; i++) {
      if (seen.has(i)) continue;
      const group = [], queue = [i]; seen.add(i);
      for (let head = 0; head < queue.length; head++) {
        const node = queue[head]; group.push(node);
        for (const other of adj[node]) if (!seen.has(other)) { seen.add(other); queue.push(other); }
      }
      groups.push(group);
    }
    return groups;
  }
  function calcular(input) {
    const data = validarDatos(input), n = data.nombres.length, respuestas = data.respondidas.filter(Boolean).length;
    if (!respuestas) fail('Registra al menos una respuesta antes de analizar.');
    const nodes = data.nombres.map((name, id) => ({ id, uid: data.ids[id], name, recPos: 0, recNeg: 0, emPos: 0, emNeg: 0, mutPos: 0, mutNeg: 0, respondida: data.respondidas[id] }));
    const links = [], adj = Array.from({ length: n }, () => []), mutual = Array.from({ length: n }, () => []), weak = Array.from({ length: n }, () => []);
    data.matriz.forEach((row, i) => row.forEach((type, j) => {
      if (!['+', '-'].includes(type)) return;
      nodes[j][type === '+' ? 'recPos' : 'recNeg']++;
      nodes[i][type === '+' ? 'emPos' : 'emNeg']++;
      const reciproca = data.matriz[j][i] === type;
      if (reciproca) nodes[i][type === '+' ? 'mutPos' : 'mutNeg']++;
      links.push({ source: i, target: j, type, reciproca });
      if (type === '+') { adj[i].push(j); weak[i].push(j); weak[j].push(i); if (reciproca) mutual[i].push(j); }
    }));
    const betweenness = intermediacion(adj), totalPos = links.filter(l => l.type === '+').length, totalNeg = links.length - totalPos;
    nodes.forEach((node, i) => {
      const oportunidades = respuestas - Number(data.respondidas[i]);
      Object.assign(node, { oportunidades, popularidad: oportunidades ? node.recPos / oportunidades : null,
        rechazoRelativo: oportunidades ? node.recNeg / oportunidades : null, intermediacion: betweenness[i] });
    });
    const arcosMutPos = nodes.reduce((s, v) => s + v.mutPos, 0), arcosMutNeg = nodes.reduce((s, v) => s + v.mutNeg, 0);
    const posiblesObservados = respuestas * (n - 1), posiblesTotales = n * (n - 1);
    return { ...data, nodes, links, metricas: { participantes: n, respuestas, cobertura: respuestas / n, totalPos, totalNeg,
      paresMutPos: arcosMutPos / 2, paresMutNeg: arcosMutNeg / 2,
      reciprocidadPos: totalPos ? arcosMutPos / totalPos : null, reciprocidadNeg: totalNeg ? arcosMutNeg / totalNeg : null,
      densidadPos: totalPos / posiblesTotales, densidadNeg: totalNeg / posiblesTotales,
      densidadObservadaPos: totalPos / posiblesObservados, densidadObservadaNeg: totalNeg / posiblesObservados,
      componentesPos: componentes(weak), subgrupos: componentes(mutual).filter(g => g.length > 1) } };
  }
  function comparar(actual, anterior) {
    const a = calcular(actual), b = calcular(anterior);
    if (a.cohorte !== b.cohorte || a.ids.length !== b.ids.length || a.ids.some(id => !b.ids.includes(id))) fail('La comparación necesita el mismo estudio y los mismos identificadores. Parte de una copia JSON del estudio original para registrar otra fecha.');
    if (a.criterio !== b.criterio || JSON.stringify(a.reglas) !== JSON.stringify(b.reglas)) fail('No se pueden comparar mediciones con preguntas o reglas de elección diferentes.');
    if (a.metricas.cobertura !== 1 || b.metricas.cobertura !== 1) fail('La comparación requiere respuestas completas en ambas mediciones.');
    if (a.fechaNoRegistrada || b.fechaNoRegistrada || a.fecha <= b.fecha) fail('La medición anterior debe tener una fecha registrada y anterior a la actual.');
    const index = new Map(b.ids.map((id, i) => [id, i]));
    let altas = 0, bajas = 0, cambiosSigno = 0;
    a.matriz.forEach((row, i) => row.forEach((v, j) => {
      if (i === j) return;
      const prev = b.matriz[index.get(a.ids[i])][index.get(a.ids[j])];
      if (v === '+' && prev !== '+') altas++;
      if (prev === '+' && v !== '+') bajas++;
      if ((v === '+' && prev === '-') || (v === '-' && prev === '+')) cambiosSigno++;
    }));
    return { fechaAnterior: b.fecha, fechaActual: a.fecha, altas, bajas, cambiosSigno,
      densidadPos: a.metricas.densidadPos - b.metricas.densidadPos,
      reciprocidadPos: a.metricas.reciprocidadPos === null || b.metricas.reciprocidadPos === null ? null : a.metricas.reciprocidadPos - b.metricas.reciprocidadPos,
      paresMutPos: a.metricas.paresMutPos - b.metricas.paresMutPos,
      personas: a.nodes.map(node => { const prev = b.nodes[index.get(node.uid)]; return { id: node.id, positivos: node.recPos - prev.recPos, negativos: node.recNeg - prev.recNeg, intermediacion: node.intermediacion - prev.intermediacion }; }) };
  }
  function validarVista(input, data) {
    const vista = input && typeof input === 'object' ? input : {}, posiciones = Object.create(null);
    for (const id of data.ids) {
      const p = vista.posiciones?.[id];
      if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) posiciones[id] = { x: Math.min(1035, Math.max(65, p.x)), y: Math.min(625, Math.max(65, p.y)), fija: p.fija === true };
    }
    return { seudonimos: vista.seudonimos !== false, filtro: ['todos', '+', '-', 'mutuas'].includes(vista.filtro) ? vista.filtro : 'todos',
      disposicion: ['automatico', 'circulo', 'rejilla'].includes(vista.disposicion) ? vista.disposicion : 'automatico', posiciones };
  }
  function validarProyecto(input) {
    const datos = validarDatos(input?.datos || input, { borrador: true });
    return { formato: 'SOCIOMAP', datos, vista: validarVista(input?.vista, datos) };
  }
  function seudonimizar(input) {
    const data = validarDatos(input, { borrador: true });
    return { ...data, grupo: 'Grupo seudonimizado', nombres: data.ids.map((_, i) => `P${i + 1}`) };
  }
  const csvText = value => /^[\s]*[=+\-@'\t\r]/.test(value) ? "'" + value : value;
  const csvCell = value => '"' + String(value ?? '').replace(/"/g, '""') + '"';
  function aCSV(input) {
    const data = validarDatos(input, { borrador: true }), { matriz, respondidas, ...meta } = data;
    const rows = [['SOCIOMAP', '2', JSON.stringify(meta)], ['De/A', ...data.nombres.map(csvText), 'Respuesta registrada'],
      ...matriz.map((row, i) => [csvText(data.nombres[i]), ...row, respondidas[i] ? '1' : '0'])];
    return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
  }
  function parseCSV(text) {
    if (typeof text !== 'string' || text.length > MAX_FILE) fail('El CSV supera el tamaño permitido (1 MB).');
    const input = text.replace(/^\uFEFF/, ''), rows = [];
    let row = [], field = '', quoted = false, closed = false;
    for (let i = 0; i < input.length; i++) {
      const c = input[i];
      if (quoted) {
        if (c === '"' && input[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') { quoted = false; closed = true; }
        else field += c;
      } else if (c === '"') {
        if (field || closed) fail('Comillas incorrectas en el CSV.');
        quoted = true;
      } else if (c === ',' || c === '\n' || c === '\r') {
        row.push(field); field = ''; closed = false;
        if (c !== ',') { rows.push(row); row = []; if (c === '\r' && input[i + 1] === '\n') i++; }
      } else { if (closed) fail('Hay texto fuera de las comillas del CSV.'); field += c; }
    }
    if (quoted) fail('El CSV tiene comillas sin cerrar.');
    if (field || row.length || closed) { row.push(field); rows.push(row); }
    return rows;
  }
  function deCSV(text) {
    const rows = parseCSV(text);
    if (rows[0]?.[0] !== 'SOCIOMAP' || rows[0]?.[1] !== '2' || rows[0].length !== 3) fail('Utiliza el CSV de matriz exportado por SOCIOMAP; conserva la fila de configuración.');
    let meta;
    try { meta = JSON.parse(rows[0][2]); } catch { fail('La configuración del CSV no es válida.'); }
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) fail('La configuración del CSV no es un objeto válido.');
    const nombres = validarNombres(meta.nombres), n = nombres.length;
    const conRegistro = rows[1]?.length === n + 2 && rows[1][n + 1] === 'Respuesta registrada';
    const ancho = n + 1 + Number(conRegistro), respondidas = conRegistro ? [] : meta.respondidas;
    if (rows.length !== n + 2 || rows[1]?.length !== ancho || rows[1][0] !== 'De/A' || nombres.some((name, i) => rows[1][i + 1] !== csvText(name))) fail('Las cabeceras del CSV no coinciden con sus participantes.');
    const matriz = rows.slice(2).map((row, i) => {
      if (row.length !== ancho || row[0] !== csvText(nombres[i])) fail('Las filas del CSV están incompletas o desordenadas.');
      if (conRegistro) {
        if (!['0', '1'].includes(row[n + 1])) fail('Respuesta registrada debe ser 1 o 0 en cada fila del CSV.');
        respondidas.push(row[n + 1] === '1');
      }
      return row.slice(1, n + 1).map(v => v === '' ? null : v);
    });
    return validarDatos({ ...meta, matriz, respondidas }, { borrador: true });
  }
  function importar(text, extension) {
    if (typeof text !== 'string' || text.length > MAX_FILE) fail('El archivo supera el tamaño permitido (1 MB).');
    if (extension?.toLowerCase() === 'csv') return validarProyecto(deCSV(text));
    let value;
    try { value = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { fail('El archivo JSON no es válido.'); }
    return validarProyecto(value);
  }
  function demo() {
    const n = 8;
    return { version: 2, cohorte: 'demo-sociomap', grupo: 'Grupo de demostración', ids: Array.from({ length: n }, (_, i) => `p${i + 1}`),
      nombres: Array.from({ length: n }, (_, i) => `P${i + 1}`), fecha: new Date().toISOString().slice(0, 10), criterio: '¿Con quién preferirías realizar una actividad de grupo?',
      reglas: { positivos: 2, negativos: 1, modo: 'maximos' }, respondidas: Array(n).fill(true),
      matriz: Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? '0' : ((i < 4) === (j < 4) && ((j % 4 === (i + 1) % 4) || (j % 4 === (i + 3) % 4))) ? '+' : j === (i + 4) % n ? '-' : '0')) };
  }
  const escaparHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = { STORAGE_KEY, MAX_FILE, normalizarNombre, validarNombres, validarDatos, calcular, comparar, validarVista, validarProyecto, seudonimizar, aCSV, deCSV, parseCSV, importar, demo, escaparHTML, intermediacion, componentes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Sociometria = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
