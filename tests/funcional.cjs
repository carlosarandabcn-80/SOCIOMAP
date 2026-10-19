// Ejecutar con Playwright instalado: node tests/funcional.cjs
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const fixture = { version: 1, grupo: 'Prueba funcional', nombres: ['Ana', 'Beto', 'Celia', 'Dani', 'Eva', 'Fran', 'Gema'],
  matriz: ['0+++---', '+0++---', '++0+---', '+++0---', '+++-0--', '+++--0-', '+++---0'].map(r => [...r]) };
const expectedPos = [6, 6, 6, 3, 0, 0, 0], expectedNeg = [0, 0, 0, 3, 6, 6, 6];
const server = http.createServer((req, res) => {
  const file = path.join(root, new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream');
    res.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    async function setup(names = fixture.nombres) {
      await page.goto(url + '/formulario.html');
      await page.fill('#grupo', fixture.grupo);
      await page.selectOption('#num', '7');
      await page.check('#custom');
      await page.fill('#names', names.join(', '));
      await page.getByRole('button', { name: 'Crear tabla', exact: true }).click();
    }
    async function fill() {
      for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) if (i !== j) {
        await page.selectOption(`[data-source="${i}"][data-target="${j}"]`, fixture.matriz[i][j]);
      }
    }
    await setup();
    assert.equal(await page.locator('#btnRanking').isDisabled(), true);
    await page.evaluate(() => procesar());
    assert.match(await page.locator('#mensaje').innerText(), /exactamente/);
    await fill();
    assert.equal(await page.locator('#mensaje').innerText(), '');
    assert.equal(await page.locator('#btnRanking').isEnabled(), true);
    await page.click('#btnRanking');
    const rows = await page.locator('#ranking tr').allTextContents();
    expectedPos.forEach((p, i) => assert.ok(rows[i + 1].startsWith(fixture.nombres[i] + p + expectedNeg[i])));
    assert.deepEqual(await page.evaluate(() => chart.data.datasets.map(d => d.data)), [expectedPos, expectedNeg]);
    await page.click('#btnSociograma');
    await page.waitForURL('**/sociograma_interactivo.html');
    await page.locator('#graph svg').waitFor();
    assert.equal(await page.locator('#graph circle').count(), 7);
    assert.equal(await page.locator('#graph path[marker-end]').count(), 42);
    assert.deepEqual(await page.locator('#graph circle').evaluateAll(els => els.map(e => e.__data__.recPos)), expectedPos);
    assert.deepEqual(await page.locator('#graph path[marker-end]').evaluateAll(els => els.map(e => [e.__data__.source.id, e.__data__.target.id, e.__data__.type])), fixture.matriz.flatMap((r, i) => r.flatMap((v, j) => v === '0' ? [] : [[i, j, v]])));
    assert.match(await page.locator('#grupoInfo').innerText(), /Prueba funcional/);
    await page.reload();
    assert.equal(await page.locator('#graph circle').count(), 7);
    console.log('PASS: ranking, Chart.js, guardado, navegación, D3, destinatarios y recarga');

    await page.goBack();
    assert.equal(await page.locator('#btnSociograma').isVisible(), false);
    await setup(); await fill(); await page.click('#btnRanking');
    await page.selectOption('[data-source="0"][data-target="1"]', '0');
    assert.equal(await page.locator('#ranking').isVisible(), false);
    assert.equal(await page.locator('#graficoBox').isVisible(), false);
    assert.equal(await page.locator('#btnRanking').isDisabled(), true);
    assert.equal(await page.evaluate(() => chart), null);
    assert.equal(await page.evaluate(() => localStorage.getItem('sociogramaData')), null);
    await page.selectOption('[data-source="0"][data-target="1"]', '+');
    await page.click('#btnRanking');
    await page.getByRole('button', { name: 'Crear tabla', exact: true }).click();
    assert.equal(await page.locator('#btnRanking').isDisabled(), true);
    assert.equal(await page.locator('#btnSociograma').isVisible(), false);
    await fill(); await page.click('#btnRanking');
    await page.fill('#grupo', 'Otro grupo');
    assert.equal(await page.locator('.cell').count(), 0);
    assert.equal(await page.locator('#ranking').isVisible(), false);
    console.log('PASS: edición, recreación, cambio de grupo y vuelta atrás limpian resultados');

    for (const names of [['Ana', ' ana ', ...fixture.nombres.slice(2)], ['Ana', '', ...fixture.nombres.slice(2)]]) {
      await setup(names);
      assert.equal(await page.locator('.cell').count(), 0);
      assert.notEqual(await page.locator('#mensaje').innerText(), '');
    }
    await setup(); await fill();
    await page.locator('.cell').first().evaluate(e => e.remove());
    await page.evaluate(() => procesar());
    assert.match(await page.locator('#mensaje').innerText(), /incompleta/);
    console.log('PASS: duplicados, nombres vacíos y matriz incompleta bloqueados');

    for (const raw of [null, '{', '{}', JSON.stringify({ ...fixture, matriz: fixture.matriz.slice(1) }), JSON.stringify({ nodes: [], links: [] })]) {
      await page.evaluate(raw => raw === null ? localStorage.clear() : localStorage.setItem('sociogramaData', raw), raw);
      await page.goto(url + '/sociograma_interactivo.html');
      assert.equal(await page.locator('#graph svg').count(), 0);
      assert.equal(await page.getByRole('link', { name: 'Volver al formulario' }).count(), 1);
    }
    console.log('PASS: datos ausentes, JSON corrupto, formato antiguo y matrices incompletas');
    const specialNames = ['<b>Ana & Luis</b>', '__proto__', ...fixture.nombres.slice(2)];
    await setup(specialNames); await fill(); await page.click('#btnRanking');
    assert.equal(await page.locator('#ranking b').count(), 0);
    await page.click('#btnSociograma');
    await page.waitForURL('**/sociograma_interactivo.html');
    const firstNode = page.locator('#graph circle').first();
    await firstNode.dispatchEvent('mouseover');
    assert.equal(await page.locator('#tooltip strong').innerText(), specialNames[0]);
    assert.equal(await page.locator('#tooltip b').count(), 0);
    console.log('PASS: nombres especiales conservados como texto en tabla, ranking y tooltip');

    await page.route('https://d3js.org/**', route => route.abort());
    await page.reload();
    assert.match(await page.locator('#graph').innerText(), /No se pudo cargar el gráfico/);
    await page.unroute('https://d3js.org/**');
    console.log('PASS: ausencia de D3 muestra recuperación sin excepción');
    await setup(); await fill(); await page.click('#btnRanking');
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Almacenamiento bloqueado'); }; });
    await page.click('#btnSociograma');
    assert.ok(page.url().endsWith('/formulario.html'));
    assert.match(await page.locator('#mensaje').innerText(), /Almacenamiento bloqueado/);
    assert.deepEqual(errors, []);
    console.log('PASS: fallo de almacenamiento impide navegar; cero excepciones no controladas');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
