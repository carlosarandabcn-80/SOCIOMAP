const { test } = require('node:test');
const assert = require('node:assert/strict');
const S = require('../sociometria.js');
const copy = d => JSON.parse(JSON.stringify(d));
function legacy(n = 7) {
  return { version: 1, grupo: 'Grupo de prueba', nombres: Array.from({ length: n }, (_, i) => `P${i + 1}`),
    matriz: Array.from({ length: n }, (_, i) => { let k = 0; return Array.from({ length: n }, (_, j) => i === j ? '0' : ++k <= 3 ? '+' : k <= 6 ? '-' : '0'); }) };
}
function graph(n, edges = [], responded = Array(n).fill(true)) {
  return { version: 2, cohorte: 'test-cohort', grupo: 'Prueba', ids: Array.from({ length: n }, (_, i) => `p${i}`),
    nombres: Array.from({ length: n }, (_, i) => `Persona ${i}`), fecha: '2026-10-21', criterio: 'Actividad de grupo',
    reglas: { positivos: n - 1, negativos: 0, modo: 'maximos' }, respondidas: responded,
    matriz: Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? '0' : responded[i] ? '0' : null))
      .map((row, i) => row.map((v, j) => edges.some(e => e[0] === i && e[1] === j) ? '+' : v)) };
}
test('regresión fase 1: cuenta por destinatario en una matriz asimétrica', () => {
  const r = S.calcular(legacy());
  assert.deepEqual(r.nodes.map(v => v.recPos), [6, 6, 6, 3, 0, 0, 0]);
  assert.deepEqual(r.nodes.map(v => v.recNeg), [0, 0, 0, 3, 6, 6, 6]);
  assert.equal(r.links.length, 42); assert.ok(r.links.every(l => l.source !== l.target));
  assert.ok(r.links.some(l => l.source === 6 && l.target === 0 && l.type === '+'));
});
test('conservación de votos e inmutabilidad con 7, 8 y 40 participantes', () => {
  for (const n of [7, 8, 40]) {
    const d = legacy(n), original = copy(d), r = S.calcular(d);
    assert.equal(r.nodes.reduce((s, v) => s + v.recPos, 0), n * 3);
    assert.equal(r.nodes.reduce((s, v) => s + v.recNeg, 0), n * 3);
    assert.equal(r.metricas.densidadPos, 3 / (n - 1));
    assert.deepEqual(d, original);
  }
});
test('migra v1 sin inventar la fecha ni el criterio de recogida', () => {
  const r = S.validarDatos(legacy()); assert.equal(r.version, 2); assert.equal(r.fechaNoRegistrada, true);
  assert.match(r.criterio, /no registrado/); assert.ok(r.respondidas.every(Boolean));
});
test('soporta grupos de 2 y elecciones negativas opcionales', () => {
  const d = graph(2, [[0, 1]]), r = S.calcular(d);
  assert.equal(r.nodes[1].recPos, 1); assert.equal(r.nodes[0].intermediacion, 0); assert.equal(r.metricas.reciprocidadPos, 0);
});
test('respuestas pendientes nunca se convierten en ceros', () => {
  const d = graph(3, [[0, 1]], [true, false, false]), r = S.calcular(d);
  assert.equal(r.metricas.cobertura, 1 / 3); assert.equal(r.nodes[0].popularidad, null);
  assert.equal(r.nodes[1].popularidad, 1); assert.equal(r.metricas.densidadPos, 1 / 6); assert.equal(r.metricas.densidadObservadaPos, 1 / 2);
  assert.equal(r.matriz[1][0], null);
  const bad = copy(d); bad.matriz[1][0] = '0'; assert.throws(() => S.validarDatos(bad), /ausencia/);
  assert.throws(() => S.calcular(graph(3, [], [false, false, false])), /al menos una/);
});
test('no confunde cero elecciones con reciprocidad indefinida', () => {
  const r = S.calcular(graph(3));
  assert.equal(r.metricas.reciprocidadPos, null); assert.equal(r.metricas.reciprocidadNeg, null);
  assert.equal(r.metricas.densidadPos, 0); assert.ok(r.nodes.every(v => v.popularidad === 0));
  assert.equal(r.metricas.subgrupos.length, 0);
});
test('reciprocidad cuenta dos arcos por par mutuo, sin mezclar signos', () => {
  const d = S.demo(), r = S.calcular(d);
  assert.equal(r.metricas.totalPos, 16); assert.equal(r.metricas.paresMutPos, 8); assert.equal(r.metricas.reciprocidadPos, 1);
  assert.equal(r.metricas.totalNeg, 8); assert.equal(r.metricas.paresMutNeg, 4);
  assert.deepEqual(r.metricas.subgrupos.map(g => g.length), [4, 4]);
});
test('intermediación dirigida: cadena de 3 nodos y diamante con dos caminos mínimos', () => {
  assert.deepEqual(S.calcular(graph(3, [[0, 1], [1, 2]])).nodes.map(v => v.intermediacion), [0, .5, 0]);
  const r = S.calcular(graph(4, [[0, 1], [0, 2], [1, 3], [2, 3]]));
  assert.deepEqual(r.nodes.map(v => v.intermediacion), [0, 1 / 12, 1 / 12, 0]);
});
test('componentes recíprocos conectados por cadenas, sin exigir clique', () => {
  const r = S.calcular(graph(4, [[0, 1], [1, 0], [1, 2], [2, 1]]));
  assert.deepEqual(r.metricas.subgrupos, [[0, 1, 2]]); assert.equal(r.metricas.componentesPos.length, 2);
});
test('cuotas exactas y máximos; borradores recuperables sin saltarse la validación final', () => {
  const d = graph(3, [[0, 1]]); d.reglas = { positivos: 1, negativos: 1, modo: 'exactos' };
  assert.throws(() => S.calcular(d), /exactamente/); assert.doesNotThrow(() => S.validarDatos(d, { borrador: true }));
  for (const reglas of [{ positivos: 1, negativos: 2, modo: 'maximos' }, { positivos: 0, negativos: 0, modo: 'maximos' }, { positivos: 1.5, negativos: 0, modo: 'exactos' }]) assert.throws(() => S.validarDatos({ ...d, reglas }));
});
test('rechaza nombres vacíos, duplicados normalizados, controles y longitudes excesivas', () => {
  for (const names of [['Ana', ' ana '], ['José', 'JOSE\u0301'], ['Ana  María', 'ana maría'], ['Ana', ''], ['Ana', null], ['Ana', 'X\nY'], ['Ana', 'a'.repeat(81)]]) assert.throws(() => S.validarNombres(names));
  assert.deepEqual(S.validarNombres(['__proto__', '<b>Ana & Luis</b>']), ['__proto__', '<b>Ana & Luis</b>']);
});
test('rechaza matrices corruptas, formatos desconocidos, autovotos y estados incoherentes', () => {
  const mutations = [d => d.version = 9, d => d.grupo = '', d => d.matriz.pop(), d => d.matriz[0].pop(), d => delete d.matriz[0][1], d => delete d.matriz[0], d => d.matriz[0][1] = 1,
    d => d.matriz[0][1] = '', d => d.matriz[0][1] = '−', d => d.matriz[0][0] = '+', d => d.nombres.pop(), d => d.ids[0] = '__proto__', d => d.ids[0] = d.ids[1],
    d => delete d.respondidas[0], d => d.fecha = '2026-02-30', d => d.fecha = 'no-fecha', d => d.matriz[0][1] = null];
  for (const mutate of mutations) { const d = graph(3); mutate(d); assert.throws(() => S.validarDatos(d)); }
  for (const d of [null, {}, [], { nodes: [], links: [] }, graph(1), graph(41)]) assert.throws(() => S.validarDatos(d));
});
test('JSON y CSV conservan borradores, nombres especiales, cuotas, fecha e identidades', () => {
  const d = graph(4, [[0, 1]], [true, false, true, false]);
  d.nombres = ['Ana, López', 'Beto "B"', '=HYPERLINK("malicioso")', "'Literal"];
  const csv = S.aCSV(d);
  assert.match(csv, /'=HYPERLINK/); assert.deepEqual(S.deCSV(csv), S.validarDatos(d, { borrador: true }));
  assert.deepEqual(S.importar(JSON.stringify(d), 'json').datos, S.validarDatos(d, { borrador: true }));
  assert.deepEqual(S.importar(csv, 'CSV').datos, S.validarDatos(d, { borrador: true }));
});
test('CSV da error ante cabeceras, orden, comillas o configuración corruptos', () => {
  const csv = S.aCSV(graph(3));
  for (const broken of [csv.replace('SOCIOMAP', 'otro'), csv.replace('Persona 0', 'cambio'), csv.slice(0, -4), '"sin cerrar', '"a"fuera', '"SOCIOMAP","2","null"']) assert.throws(() => S.deCSV(broken));
  for (const raw of ['{', 'null', '{}', 'x'.repeat(S.MAX_FILE + 1)]) assert.throws(() => S.importar(raw, 'json'));
});
test('seudonimiza sin perder matriz, identidades estables ni criterio', () => {
  const d = graph(3), result = S.seudonimizar(d);
  assert.deepEqual(result.nombres, ['P1', 'P2', 'P3']); assert.equal(result.grupo, 'Grupo seudonimizado');
  assert.deepEqual(result.ids, d.ids); assert.deepEqual(result.matriz, d.matriz); assert.deepEqual(d.nombres, ['Persona 0', 'Persona 1', 'Persona 2']);
});
test('comparación usa identidades estables y admite reordenar la matriz', () => {
  const previous = S.demo(); previous.fecha = '2026-10-01'; const current = copy(previous); current.fecha = '2026-10-21'; current.matriz[0][1] = '0'; current.matriz[0][2] = '+';
  const c = S.comparar(current, previous);
  assert.equal(c.altas, 1); assert.equal(c.bajas, 1); assert.equal(c.cambiosSigno, 0); assert.equal(c.paresMutPos, -1); assert.equal(c.densidadPos, 0);
  assert.equal(c.personas[1].positivos, -1); assert.equal(c.personas[2].positivos, 1);
  const order = [7, 6, 5, 4, 3, 2, 1, 0], reordered = { ...previous, ids: order.map(i => previous.ids[i]), nombres: order.map(i => previous.nombres[i]), respondidas: order.map(i => previous.respondidas[i]), matriz: order.map(i => order.map(j => previous.matriz[i][j])) };
  assert.deepEqual(S.comparar(current, reordered), c);
});
test('bloquea comparaciones entre cohortes, reglas, fechas o coberturas incompatibles', () => {
  const actual = S.demo(); actual.fecha = '2026-10-21'; const previous = copy(actual); previous.fecha = '2026-10-01';
  const mutations = [d => d.cohorte = 'otra', d => d.ids[0] = 'otra-persona', d => d.reglas.positivos = 3, d => d.criterio = 'Otro criterio', d => d.fecha = actual.fecha,
    d => d.fechaNoRegistrada = true, d => { d.respondidas[0] = false; d.matriz[0] = d.matriz[0].map((_, i) => i === 0 ? '0' : null); }];
  for (const mutate of mutations) { const d = copy(previous); mutate(d); assert.throws(() => S.comparar(actual, d)); }
});
test('valida posiciones, descarta identificadores ajenos y limita coordenadas', () => {
  const d = graph(3), v = S.validarVista({ seudonimos: false, filtro: 'invalido', disposicion: 'x', posiciones: { p0: { x: -1, y: 9999, fija: true }, p1: { x: NaN, y: 2 }, externo: { x: 30, y: 40 } } }, d);
  assert.equal(v.seudonimos, false); assert.equal(v.filtro, 'todos'); assert.deepEqual(v.posiciones.p0, { x: 65, y: 625, fija: true }); assert.equal(Object.keys(v.posiciones).length, 1);
});
