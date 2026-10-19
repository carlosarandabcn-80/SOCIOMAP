const { test } = require('node:test');
const assert = require('node:assert/strict');
const S = require('../sociometria.js');
function fixture(n = 7) {
  return { version: 1, grupo: 'Grupo de prueba', nombres: Array.from({ length: n }, (_, i) => `P${i + 1}`),
    matriz: Array.from({ length: n }, (_, i) => {
      let k = 0;
      return Array.from({ length: n }, (_, j) => i === j ? '0' : ++k <= 3 ? '+' : k <= 6 ? '-' : '0');
    }) };
}
module.exports = { fixture };
test('asigna votos a destinatarios, incluida primera y última columna', () => {
  const result = S.calcular(fixture());
  assert.deepEqual(result.nodes.map(n => n.recPos), [6, 6, 6, 3, 0, 0, 0]);
  assert.deepEqual(result.nodes.map(n => n.recNeg), [0, 0, 0, 3, 6, 6, 6]);
  assert.equal(result.links.length, 42);
  assert.ok(result.links.some(l => l.source === 6 && l.target === 0 && l.type === '+'));
  assert.ok(result.links.some(l => l.source === 0 && l.target === 6 && l.type === '-'));
  assert.ok(result.links.every(l => l.source !== l.target));
});
test('conserva 3N votos por signo con 7, 8 y 40 participantes', () => {
  for (const n of [7, 8, 40]) {
    const result = S.calcular(fixture(n));
    assert.equal(result.nodes.reduce((a, b) => a + b.recPos, 0), n * 3);
    assert.equal(result.nodes.reduce((a, b) => a + b.recNeg, 0), n * 3);
    assert.deepEqual(S.validarDatos(JSON.parse(JSON.stringify(result))), fixture(n));
  }
});
test('rechaza nombres duplicados, vacíos y no textuales', () => {
  for (const names of [ ['Ana', ' ana '], ['José', 'JOSE\u0301'], ['Ana  María', 'ana maría'], ['Ana', ''], ['Ana', null] ]) {
    const data = fixture(); data.nombres.splice(0, 2, ...names);
    assert.throws(() => S.validarDatos(data));
  }
});
test('rechaza formatos, dimensiones, celdas y filas inválidas', () => {
  const mutations = [d => d.version = 2, d => d.grupo = '', d => d.matriz.pop(),
    d => d.matriz[0].pop(), d => delete d.matriz[0][1], d => delete d.matriz[0],
    d => d.matriz[0][1] = 1, d => d.matriz[0][1] = '', d => d.matriz[0][1] = '−',
    d => d.matriz[0][0] = '+', d => d.matriz[0][1] = '0', d => d.nombres.pop()];
  for (const mutate of mutations) { const d = fixture(); mutate(d); assert.throws(() => S.validarDatos(d)); }
  for (const d of [null, {}, [], { nodes: [], links: [] }, fixture(6), fixture(41)]) assert.throws(() => S.validarDatos(d));
});
test('nombres especiales son texto y no afectan a índices de destinatario', () => {
  const data = fixture(); data.nombres[0] = '__proto__'; data.nombres[1] = '<b>Ana & Luis</b>';
  const result = S.calcular(data);
  assert.equal(result.nodes[0].recPos, 6);
  assert.equal(S.escaparHTML(data.nombres[1]), '&lt;b&gt;Ana &amp; Luis&lt;/b&gt;');
});
