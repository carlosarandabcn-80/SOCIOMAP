const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');
const S = require('../sociometria.js');
const root = path.resolve(__dirname, '..');
const qa = process.env.QA_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'sociomap-qa-'));
fs.mkdirSync(qa, { recursive: true });
const fixture = { version: 1, grupo: 'Prueba funcional', nombres: ['Ana', 'Beto', 'Celia', 'Dani', 'Eva', 'Fran', 'Gema'],
  matriz: ['0+++---', '+0++---', '++0+---', '+++0---', '+++-0--', '+++--0-', '+++---0'].map(r => [...r]) };
const expectedPos = [6, 6, 6, 3, 0, 0, 0], expectedNeg = [0, 0, 0, 3, 6, 6, 6];
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    const type = { '.js': 'text/javascript', '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.pdf': 'application/pdf', '.json': 'application/json' }[path.extname(file)] || 'application/octet-stream';
    res.setHeader('Content-Type', type); res.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}), ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const errors = [], external = [], consoleErrors = [];
  context.on('page', p => { p.on('pageerror', e => errors.push(e.message)); p.on('console', e => { if (e.type() === 'error') consoleErrors.push(e.text()); }); p.on('dialog', d => d.accept()); });
  context.on('request', r => { if (!r.url().startsWith(url) && !r.url().startsWith('blob:') && !r.url().startsWith('data:')) external.push(r.url()); });
  const page = await context.newPage(); page.setDefaultTimeout(12000);
  const state = () => page.evaluate(key => JSON.parse(sessionStorage.getItem(key) || localStorage.getItem(key)), S.STORAGE_KEY);
  async function clean() { await page.goto(url + '/formulario.html'); await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); }); await page.reload(); }
  async function load(data = S.demo()) { await clean(); await page.evaluate(({ key, data }) => sessionStorage.setItem(key, JSON.stringify({ datos: data })), { key: S.STORAGE_KEY, data }); await page.reload(); }
  async function upload(data, name = 'estudio.json', target = '#importar') { await page.setInputFiles(target, { name, mimeType: name.endsWith('csv') ? 'text/csv' : 'application/json', buffer: Buffer.from(typeof data === 'string' ? data : JSON.stringify(data)) }); }
  async function download(selector, filename) {
    const pending = page.waitForEvent('download'); await page.click(selector); const dl = await pending;
    const output = path.join(qa, filename || dl.suggestedFilename()); await dl.saveAs(output); assert.equal(await dl.failure(), null); return output;
  }
  try {
    await page.goto(url + '/index.html');
    assert.equal(await page.getByRole('link', { name: 'Abrir un estudio', exact: true }).count(), 1);
    await page.getByRole('button', { name: 'Explorar una demostración' }).click();
    await page.waitForURL('**/sociograma_interactivo.html'); assert.equal(await page.locator('#graph .node').count(), 8);
    assert.equal(await page.locator('#graph .link').count(), 24);
    await page.screenshot({ path: path.join(qa, 'sociograma-desktop.png'), fullPage: true });
    console.log('PASS 1: inicio, demostración y grafo sin peticiones externas');

    await clean(); await page.fill('#grupo', fixture.grupo); await page.fill('#fecha', '2026-10-21'); await page.check('#custom'); await page.fill('#names', fixture.nombres.join('\n'));
    await page.click('#crearTabla'); assert.equal(await page.locator('.cell').count(), 42); assert.equal(await page.locator('#btnRanking').isDisabled(), true);
    assert.equal((await state()).datos.respondidas.filter(Boolean).length, 0);
    for (let i = 0; i < 7; i++) await page.check(`[data-response="${i}"]`);
    for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) if (i !== j) await page.selectOption(`[data-source="${i}"][data-target="${j}"]`, fixture.matriz[i][j]);
    assert.equal(await page.locator('#btnRanking').isEnabled(), true);
    await page.reload(); assert.equal(await page.locator('[data-source="0"][data-target="1"]').inputValue(), '+');
    await page.click('#btnRanking'); assert.equal(await page.locator('#resultadosPanel').isVisible(), true);
    const counts = await page.locator('#ranking tbody tr').evaluateAll(rows => rows.map(r => [r.cells[2].textContent, r.cells[3].textContent]));
    assert.deepEqual(counts, expectedPos.map((v, i) => [String(v), String(expectedNeg[i])]));
    const registered = (await state()).datos;
    await page.click('#btnSociograma'); await page.waitForURL('**/sociograma_interactivo.html');
    assert.equal(await page.locator('#graph .node').count(), 7); assert.equal(await page.locator('#graph .link').count(), 42);
    const pairs = await page.locator('#graph .link').evaluateAll(els => els.map(e => [Number(e.dataset.source), Number(e.dataset.target), e.dataset.type]));
    assert.deepEqual(pairs, fixture.matriz.flatMap((r, i) => r.flatMap((v, j) => v === '0' ? [] : [[i, j, v]])));
    console.log('PASS 2: alta, votos asimétricos, validación, recarga, ranking y destinatarios del sociograma');

    await page.selectOption('#filtro', '+'); assert.equal(await page.locator('#graph .link').count(), 21);
    await page.selectOption('#filtro', '-'); assert.equal(await page.locator('#graph .link').count(), 21);
    await page.selectOption('#filtro', 'mutuas'); assert.equal(await page.locator('#graph .link').count(), 12);
    await page.selectOption('#filtro', 'todos'); await page.fill('#buscar', 'P1');
    assert.match(await page.locator('#seleccionInfo').innerText(), /P1/); assert.equal(await page.locator('#participante').inputValue(), '0');
    const before = (await state()).vista.posiciones[registered.ids[0]];
    await page.locator('[data-node="0"]').focus(); await page.keyboard.press('ArrowRight');
    const moved = (await state()).vista.posiciones[registered.ids[0]]; assert.equal(moved.x, Math.min(1035, before.x + 12));
    await page.click('#deshacer'); assert.deepEqual((await state()).vista.posiciones[registered.ids[0]], before);
    await page.click('#fijar'); assert.equal((await state()).vista.posiciones[registered.ids[0]].fija, true);
    await page.selectOption('#disposicion', 'rejilla'); assert.equal((await state()).vista.posiciones[registered.ids[0]].x, before.x);
    await page.reload(); assert.equal((await state()).vista.posiciones[registered.ids[0]].fija, true);
    await page.uncheck('#seudonimos'); assert.match(await page.locator('#ranking tbody tr').first().innerText(), /Ana/);
    await page.fill('#buscar', 'Ana'); assert.equal(await page.locator('#participante').inputValue(), '0');
    await page.click('#acercar'); assert.ok(await page.locator('#graph').evaluate(e => e.viewBox.baseVal.width < 1100)); await page.click('#ajustar');
    console.log('PASS 3: filtros, búsqueda, teclado, fijación, deshacer y persistencia de posiciones');

    const json = JSON.parse(fs.readFileSync(await download('#exportJSON', 'copia-seudonimos.json'), 'utf8'));
    assert.deepEqual(json.datos.nombres, Array.from({ length: 7 }, (_, i) => `P${i + 1}`)); assert.equal(json.datos.grupo, 'Grupo seudonimizado');
    const csv = fs.readFileSync(await download('#exportCSV', 'matriz-seudonimos.csv'), 'utf8'); assert.deepEqual(S.deCSV(csv).matriz, fixture.matriz);
    const svgPath = await download('#exportSVG', 'sociograma.svg'); const svgText = fs.readFileSync(svgPath, 'utf8'); assert.match(svgText, /SOCIOMAP/); assert.ok(!svgText.includes('Ana'));
    const pngPath = await download('#exportPNG', 'sociograma.png'); assert.equal(fs.readFileSync(pngPath).subarray(1, 4).toString(), 'PNG');
    const pdfPath = await download('#exportPDF', 'informe.pdf'); assert.match(fs.readFileSync(pdfPath).subarray(0, 8).toString(), /^%PDF/);
    const { PDFDocument } = require('../vendor/pdf-lib.min.js'); const pdf = await PDFDocument.load(fs.readFileSync(pdfPath)); assert.ok(pdf.getPageCount() >= 4);
    await page.check('#incluirNombres'); const named = JSON.parse(fs.readFileSync(await download('#exportJSON', 'copia-originales.json'), 'utf8')); assert.equal(named.datos.nombres[0], 'Ana');
    console.log('PASS 4: descargas reales PNG, SVG, PDF, JSON y CSV; seudónimos por defecto y nombres solo por elección');

    await page.getByRole('link', { name: 'Mapa de calor', exact: true }).last().click();
    await page.waitForURL('**/MapaCalor_web.html'); assert.equal(await page.locator('#heatmap tbody tr').count(), 7); assert.equal(await page.locator('#heatmap td.positive').count(), 21);
    await download('#exportPNG', 'mapa-calor.png'); await download('#exportSVG', 'mapa-calor.svg');
    await page.getByRole('link', { name: 'Volver al sociograma', exact: true }).click();
    await page.getByRole('link', { name: 'Editar respuestas', exact: true }).click();
    await page.selectOption('[data-source="0"][data-target="1"]', '0'); assert.equal(await page.locator('#resultadosPanel').isVisible(), false); assert.equal(await page.locator('#btnRanking').isDisabled(), true);
    assert.equal((await state()).datos.matriz[0][1], '0'); await page.selectOption('[data-source="0"][data-target="1"]', '+');
    await page.uncheck('[data-response="0"]'); assert.equal((await state()).datos.respondidas[0], false); assert.equal((await state()).datos.matriz[0][1], null);
    await page.check('#parcial'); assert.equal(await page.locator('#btnRanking').isEnabled(), true); await page.click('#btnRanking'); assert.match(await page.locator('#resumen').innerText(), /provisional/);
    await page.reload(); assert.equal(await page.locator('#parcial').isChecked(), false); assert.equal(await page.locator('#btnRanking').isDisabled(), true);
    console.log('PASS 5: mapa de calor conectado, edición invalida resultados y análisis parcial exige aceptación');

    await load(S.demo()); const base = (await state()).datos; base.fecha = '2026-10-01';
    await page.fill('#fecha', '2026-10-21'); await page.click('#crearTabla'); assert.ok((await state()).datos.respondidas.every(Boolean));
    await page.click('#btnRanking'); await page.click('#btnSociograma');
    await upload(base, 'anterior.json', '#compararArchivo'); await page.locator('#comparacion table').waitFor(); assert.match(await page.locator('#mensajeComparacion').innerText(), /compatibles/);
    await upload({ ...base, cohorte: 'otra' }, 'otra.json', '#compararArchivo'); assert.match(await page.locator('#mensajeComparacion').innerText(), /mismo estudio/); assert.equal(await page.locator('#comparacion table').count(), 0);
    await page.getByRole('link', { name: 'Editar respuestas', exact: true }).click(); const cohort = (await state()).datos.cohorte, ids = (await state()).datos.ids;
    await page.click('#nuevaMedicion'); assert.equal((await state()).datos.cohorte, cohort); assert.deepEqual((await state()).datos.ids, ids); assert.ok((await state()).datos.respondidas.every(v => !v));
    console.log('PASS 6: nueva medición conserva identidades; comparación válida y rechazo de cohortes incompatibles');

    await load(S.demo()); await page.check('#recordar'); assert.equal(await page.evaluate(key => sessionStorage.getItem(key), S.STORAGE_KEY), null); assert.ok(await page.evaluate(key => localStorage.getItem(key), S.STORAGE_KEY));
    const tab = await context.newPage(); await tab.goto(url + '/sociograma_interactivo.html'); assert.equal(await tab.locator('#graph .node').count(), 8); await tab.close();
    await page.uncheck('#recordar'); assert.equal(await page.evaluate(key => localStorage.getItem(key), S.STORAGE_KEY), null); assert.ok(await page.evaluate(key => sessionStorage.getItem(key), S.STORAGE_KEY));
    await page.click('#borrarDatos'); await page.waitForLoadState(); assert.equal(await page.evaluate(key => sessionStorage.getItem(key), S.STORAGE_KEY), null);
    console.log('PASS 7: almacenamiento temporal, persistencia optativa, recuperación en otra pestaña y borrado');

    await clean(); await upload('{', 'invalido.json'); assert.match(await page.locator('#mensaje').innerText(), /no es válido/);
    const special = S.demo(); special.nombres[0] = '<img src=x onerror=alert(1)>'; special.nombres[1] = '__proto__';
    await upload(special); await page.locator('#tablaVotos').waitFor(); assert.equal(await page.locator('#tabla img').count(), 0);
    await page.click('#btnRanking'); await page.click('#btnSociograma'); await page.uncheck('#seudonimos');
    assert.equal(await page.locator('#graph image').count(), 0); assert.ok((await page.locator('#ranking').innerText()).includes(special.nombres[0]));
    for (const raw of ['{', '{}', JSON.stringify({ datos: { version: 200 } })]) {
      await page.evaluate(({ key, raw }) => sessionStorage.setItem(key, raw), { key: S.STORAGE_KEY, raw }); await page.reload(); assert.equal(await page.locator('#graph').count(), 0); assert.equal(await page.getByRole('link', { name: 'Volver al formulario', exact: true }).count(), 1);
    }
    console.log('PASS 8: importación inválida, JSON corrupto y nombres con HTML presentados como texto');

    await clean(); await page.fill('#grupo', 'Duplicados'); await page.selectOption('#num', '2'); await page.check('#custom'); await page.fill('#names', 'Ana\n ana '); await page.click('#crearTabla'); assert.match(await page.locator('#mensaje').innerText(), /duplicados/); assert.equal(await page.locator('#tablaVotos').count(), 0);
    await load(S.demo()); await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Almacenamiento bloqueado'); }; }); await page.click('#btnRanking'); assert.equal(await page.locator('#btnSociograma').isVisible(), false); assert.match(await page.locator('#guardado').innerText(), /bloqueado/);
    // Una página nueva restaura el prototipo normal de Storage.
    await page.reload();
    console.log('PASS 9: duplicados y fallos de almacenamiento sin perder la matriz en memoria');

    const phone = await context.newPage(); await phone.setViewportSize({ width: 390, height: 844 });
    await phone.goto(url + '/index.html'); await phone.getByRole('button', { name: 'Explorar una demostración' }).click();
    await phone.waitForURL('**/sociograma_interactivo.html');
    for (const file of ['index.html', 'instrucciones.html', 'formulario.html', 'sociograma_interactivo.html', 'MapaCalor_web.html']) {
      await phone.goto(url + '/' + file);
      assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Desbordamiento horizontal: ' + file);
      await phone.screenshot({ path: path.join(qa, 'movil-' + file.replace('.html', '') + '.png'), fullPage: true });
    }
    await phone.close();
    console.log('PASS 10: cinco páginas a 390 px, incluida la matriz y el mapa con datos');

    const n = 40, big = S.validarDatos({ version: 1, grupo: 'Prueba 40', nombres: Array.from({ length: n }, (_, i) => `P${i + 1}`), matriz: Array.from({ length: n }, (_, i) => { let k = 0; return Array.from({ length: n }, (_, j) => i === j ? '0' : ++k <= 3 ? '+' : k <= 6 ? '-' : '0'); }) });
    big.nombres[0] = 'Álvaro López'; big.nombres[1] = 'Κατερίνα'; big.nombres[2] = 'Кирилл'; big.fechaNoRegistrada = false; big.fecha = '2026-10-21';
    await load(big); assert.equal(await page.locator('.cell').count(), 1560);
    await page.click('#btnRanking'); await page.click('#btnSociograma'); assert.equal(await page.locator('#graph .node').count(), 40); assert.equal(await page.locator('#graph .link').count(), 240);
    const first = page.locator('[data-node="0"]'); await first.scrollIntoViewIfNeeded(); const box = await first.boundingBox(), initial = (await state()).vista.posiciones[big.ids[0]];
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 20, { steps: 4 }); await page.mouse.up();
    assert.notDeepEqual((await state()).vista.posiciones[big.ids[0]], initial); await page.click('#deshacer'); assert.deepEqual((await state()).vista.posiciones[big.ids[0]], initial);
    await page.check('#incluirNombres'); const bigPdf = await PDFDocument.load(fs.readFileSync(await download('#exportPDF', 'informe-40.pdf'))); assert.ok(bigPdf.getPageCount() >= 7);
    await page.locator('.graph-wrap').screenshot({ path: path.join(qa, 'sociograma-40.png') });
    await clean(); await upload(S.aCSV(big), 'matriz.csv'); await page.locator('#tablaVotos').waitFor(); assert.equal(await page.locator('.cell').count(), 1560); assert.deepEqual((await state()).datos.matriz, big.matriz);
    console.log('PASS 11: 40 participantes, 1560 selectores, 240 relaciones, arrastre, PDF multipágina e importación CSV');
    await load(S.demo()); await page.click('#btnRanking'); await page.click('#btnSociograma');
    await page.screenshot({ path: path.join(qa, 'sociograma-final.png'), fullPage: true });
    assert.deepEqual(errors, []); assert.deepEqual(external, []); assert.deepEqual(consoleErrors, []);
    console.log('PASS: cero excepciones JavaScript, errores de consola y peticiones externas');
    console.log('QA_DIR=' + qa);
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
