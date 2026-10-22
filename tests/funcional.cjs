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
  const url = 'http://127.0.0.1:' + server.address().port;
  const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}), ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const errors = [], external = [], consoleErrors = [];
  context.on('page', p => { p.on('pageerror', e => errors.push(e.message)); p.on('console', e => { if (e.type() === 'error') consoleErrors.push(e.text()); }); p.on('dialog', d => d.accept()); });
  context.on('request', r => { if (!r.url().startsWith(url) && !r.url().startsWith('blob:') && !r.url().startsWith('data:')) external.push(r.url()); });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const state = () => page.evaluate(key => JSON.parse(sessionStorage.getItem(key) || localStorage.getItem(key)), S.STORAGE_KEY);
  async function clean() {
    await page.goto(url + '/formulario.html');
    await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
    await page.reload();
  }
  async function load(data) {
    await clean();
    await page.evaluate(({ key, data }) => sessionStorage.setItem(key, JSON.stringify({ datos: data })), { key: S.STORAGE_KEY, data });
    await page.reload();
  }
  async function download(selector, filename) {
    const pending = page.waitForEvent('download');
    await page.click(selector);
    const dl = await pending;
    const output = path.join(qa, filename || dl.suggestedFilename());
    await dl.saveAs(output);
    assert.equal(await dl.failure(), null);
    return output;
  }
  try {
    await page.goto(url + '/index.html');
    assert.equal(await page.locator('.brand-image img').count(), 1);
    assert.equal(await page.getByRole('link', { name: /Crear sociograma/ }).count(), 1);
    assert.equal(await page.locator('.logo-intro img[src="logo-sociograma.webp"]').count(), 1);
    assert.equal(await page.getByRole('link', { name: 'Mapa de calor' }).count(), 0);
    await page.getByRole('link', { name: /Crear sociograma/ }).click();
    await page.waitForURL('**/formulario.html');
    assert.equal(await page.locator('#importar').count(), 0);
    assert.equal(await page.locator('#positivos').count(), 0);
    assert.equal(await page.locator('#negativos').count(), 0);
    assert.equal(await page.locator('#num option').count(), 34);
    assert.equal(await page.locator('.brand-image img').count(), 1);
    console.log('PASS 1: home y formulario simplificados, logo en cabecera, sin importación');

    await page.fill('#grupo', 'Prueba funcional');
    await page.locator('.simple-details summary').click();
    await page.check('#custom');
    const names = ['Ana', 'Beto', 'Celia', 'Dani', 'Eva', 'Fran', 'Gema'];
    await page.fill('#names', names.join('\n'));
    await page.click('#crearTabla');
    assert.equal(await page.locator('.vote-select').count(), 6);
    assert.equal(await page.locator('.person-pill').count(), 7);
    assert.equal((await state()).datos.respondidas.filter(Boolean).length, 0);
    for (let i = 0; i < 7; i++) {
      await page.locator('.person-pill').nth(i).click();
      for (let slot = 0; slot < 3; slot++) {
        await page.selectOption('[data-sign="+"][data-slot="' + slot + '"]', String((i + slot + 1) % 7));
        await page.selectOption('[data-sign="-"][data-slot="' + slot + '"]', String((i + slot + 4) % 7));
      }
      assert.match(await page.locator('#estadoPersona').innerText(), /Completa/);
    }
    const datos = (await state()).datos;
    assert.equal(datos.nombres[0], 'Ana');
    assert.ok(datos.respondidas.every(Boolean));
    assert.ok(datos.matriz.every((row, i) => row[i] === '0' && row.filter(v => v === '+').length === 3 && row.filter(v => v === '-').length === 3));
    assert.equal(await page.locator('#btnRanking').isEnabled(), true);
    assert.match(await page.locator('#progreso').innerText(), /7 de 7/);
    await page.reload();
    assert.equal(await page.locator('.person-pill.done').count(), 7);
    console.log('PASS 2: seis selecciones distintas por persona y recuperación de sesión');

    await page.click('#btnRanking');
    assert.equal(await page.locator('#resultadosPanel').isVisible(), true);
    assert.equal(await page.locator('#ranking tbody tr').count(), 7);
    await page.click('#btnSociograma');
    await page.waitForURL('**/sociograma_interactivo.html');
    assert.equal(await page.locator('#graph .node').count(), 7);
    assert.equal(await page.locator('#graph .link').count(), 42);
    const json = JSON.parse(fs.readFileSync(await download('#exportJSON', 'copia.json'), 'utf8'));
    assert.deepEqual(json.datos.nombres, Array.from({ length: 7 }, (_, i) => 'P' + (i + 1)));
    const csv = fs.readFileSync(await download('#exportCSV', 'matriz.csv'), 'utf8');
    assert.deepEqual(S.deCSV(csv).matriz, datos.matriz);
    console.log('PASS 3: sociograma y exportaciones conservados');

    await page.getByRole('link', { name: 'Editar respuestas', exact: true }).click();
    await page.locator('.person-pill').first().click();
    await page.selectOption('[data-sign="+"][data-slot="0"]', '');
    assert.equal(await page.locator('#btnRanking').isDisabled(), true);
    assert.equal((await state()).datos.matriz[0].filter(v => v === '+').length, 2);
    await page.selectOption('[data-sign="+"][data-slot="0"]', '1');
    assert.equal(await page.locator('#btnRanking').isEnabled(), true);
    console.log('PASS 4: corrección de votos sin perder los demás');

    await clean();
    await page.fill('#grupo', 'Duplicados');
    await page.locator('.simple-details summary').click();
    await page.check('#custom');
    await page.fill('#names', ['Ana','ana','C','D','E','F','G'].join('\n'));
    await page.click('#crearTabla');
    assert.match(await page.locator('#mensaje').innerText(), /duplicados/);
    assert.equal(await page.locator('#matrizPanel').isVisible(), false);
    console.log('PASS 5: nombres duplicados rechazados');

    const n = 40;
    const big = S.validarDatos({ version: 1, grupo: 'Prueba 40', nombres: Array.from({ length: n }, (_, i) => 'P' + (i + 1)),
      matriz: Array.from({ length: n }, (_, i) => {
        let k = 0;
        return Array.from({ length: n }, (_, j) => i === j ? '0' : ++k <= 3 ? '+' : k <= 6 ? '-' : '0');
      }) });
    await load(big);
    assert.equal(await page.locator('.person-pill').count(), 40);
    assert.equal(await page.locator('.vote-select').count(), 6);
    await page.click('#btnRanking');
    await page.click('#btnSociograma');
    assert.equal(await page.locator('#graph .node').count(), 40);
    assert.equal(await page.locator('#graph .link').count(), 240);
    console.log('PASS 6: hasta 40 personas sin matriz de 1.560 selectores');

    const phone = await context.newPage();
    await phone.setViewportSize({ width: 390, height: 844 });
    for (const file of ['index.html','formulario.html','sociograma_interactivo.html','instrucciones.html']) {
      await phone.goto(url + '/' + file);
      assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Desbordamiento horizontal en ' + file);
      await phone.screenshot({ path: path.join(qa, 'movil-' + file.replace('.html', '') + '.png'), fullPage: true });
    }
    await phone.close();
    await page.goto(url + '/formulario.html');
    await page.click('#borrarDatos');
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), S.STORAGE_KEY), null);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    assert.deepEqual(consoleErrors, []);
    console.log('PASS 7: diseño móvil, borrado y cero errores de JavaScript');
    console.log('QA_DIR=' + qa);
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });