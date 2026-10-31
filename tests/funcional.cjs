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
    await page.goto(url + '/demo.html');
    assert.equal(await page.locator('#grafoDemo [data-demo-node]').count(), 8);
    assert.equal(await page.locator('#grafoDemo image').count(),8,'Demo con ocho retratos ficticios');
    assert.equal(await page.locator('#graficoRankingDemo .ranking-interactivo').count(), 8);
    assert.equal(await page.locator('#graficoRankingDemo img.avatar-ranking').count(),8);
    assert.equal(await page.locator('#rankingDemo tbody tr').count(), 8);
    await page.locator('#graficoRankingDemo .ranking-interactivo').first().click();
    assert.match(await page.locator('#detalleDemo').innerText(), /elecciones positivas/);
    assert.equal(await page.locator('#graficoRankingDemo [aria-pressed="true"]').count(), 1);
    await page.locator('#grafoDemo [data-demo-node="3"]').click();
    assert.equal(await page.locator('.demo-move:enabled').count(), 4);
    const demoInitial=Number(await page.locator('#grafoDemo [data-demo-node="3"] circle').getAttribute('cx'));
    await page.locator('[data-demo-move="right"]').click();
    assert.equal(Number(await page.locator('#grafoDemo [data-demo-node="3"] circle').getAttribute('cx'))-demoInitial,24);
    assert.equal(await page.locator('#graficoRankingDemo [data-rank-node="3"]').getAttribute('aria-pressed'),'true');
    await page.locator('#grafoDemo [data-demo-node]').first().focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#grafoDemo .selected').count(), 1);
    const boxAnterior=await page.locator('#grafoDemo').getAttribute('viewBox');
    await page.click('#demoZoomMas');
    assert.notEqual(await page.locator('#grafoDemo').getAttribute('viewBox'),boxAnterior);
    const initialDemoView = await page.locator('#grafoDemo').getAttribute('viewBox');
    await page.locator('[data-demo-pan="right"]').click();
    assert.notEqual(await page.locator('#grafoDemo').getAttribute('viewBox'),initialDemoView);
    await page.click('#demoZoomAjustar');
    assert.equal(await page.locator('#grafoDemo').getAttribute('viewBox'),'0 0 810 660');
    await page.click('#restablecerDemo');
    assert.match(await page.locator('#detalleDemo').innerText(), /recuperadas/);
    assert.equal(await page.locator('#graficoRankingDemo [aria-pressed="true"]').count(), 0);
    await page.selectOption('#filtroDemo', '+');
    assert.equal(await page.locator('#grafoDemo line').count(), 24);
    await page.selectOption('#filtroDemo', '-');
    assert.equal(await page.locator('#grafoDemo line').count(), 24);
    assert.equal(await page.locator('#descripcionDemo p').count(), 4);
    await page.goto(url + '/index.html');
    assert.equal(await page.locator('.nav-links:visible').count(),0);
    await page.click('#abrirAccesibilidad');
    assert.equal(await page.locator('#panelAccesibilidad').isVisible(),true);
    await page.click('#tamanoTexto');
    assert.equal(await page.locator('html.a11y-large').count(),1);
    await page.click('#altoContraste');
    assert.equal(await page.locator('html.a11y-contrast').count(),1);
    await page.click('#reducirMovimiento');
    assert.equal(await page.locator('html.a11y-motion').count(),1);
    await page.click('#restablecerAccesibilidad');
    assert.equal(await page.locator('html.a11y-large').count(),0);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#panelAccesibilidad').isVisible(),false);
    assert.equal(await page.locator('.brand-image img').count(), 1);
    assert.equal(await page.getByRole('link', { name: /Acceso a la app/ }).count(), 1);
    assert.equal(await page.locator('.logo-intro img[src="logo-sociograma.webp"]').count(), 1);
    assert.equal(await page.getByRole('link', { name: 'Mapa de calor' }).count(), 0);
    await page.getByRole('link', { name: /Acceso a la app/ }).click();
    await page.waitForURL('**/acceso.html');
    const pdfDirecto=await download('#descargarPaso2','pdf-universal.pdf');
    const { PDFDocument: PdfUniversal }=require('../vendor/pdf-lib.min.js');
    assert.equal((await PdfUniversal.load(fs.readFileSync(pdfDirecto))).getPageCount(),1);
    await page.fill('#grupo', 'Grupo inicial');
    const pdfPrevio=await download('#descargarPDF', 'cuestionarios-acceso.pdf');
    const { PDFDocument: PdfAcceso }=require('../vendor/pdf-lib.min.js');
    assert.equal((await PdfAcceso.load(fs.readFileSync(pdfPrevio))).getPageCount(),1);
    await page.getByRole('button', { name: /Acceder a tabla sociométrica/ }).click();
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
    const pdfCuestionarios = await download('#descargarCuestionarios', 'cuestionarios-prueba.pdf');
    const { PDFDocument } = require('../vendor/pdf-lib.min.js');
    const hojas = await PDFDocument.load(fs.readFileSync(pdfCuestionarios));
    assert.equal(hojas.getPageCount(), 1, 'Plantilla universal en una hoja A4');
    assert.deepEqual(hojas.getPages()[0].getSize(), { width: 595.28, height: 841.89 });
    assert.match(await page.locator('#mensaje').innerText(), /dos papeletas/);
    console.log('PASS PDF: una hoja A4 universal para dos personas');
    await page.click('#crearTabla');
    const portrait=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/TyQAAAAASUVORK5CYII=','base64');
    await page.locator('#fotoParticipante').setInputFiles({name:'retrato.png',mimeType:'image/png',buffer:portrait});
    await page.waitForFunction(key=>{
      const saved=JSON.parse(sessionStorage.getItem(key));
      return Object.values(saved?.datos?.fotos||{}).length===1;
    },S.STORAGE_KEY);
    assert.equal(await page.locator('.avatar-editor[src^="data:image/"]').count(),1);
    assert.equal(await page.locator('.person-pill img').count(),1);
    await page.reload();
    assert.equal(await page.locator('.avatar-editor[src^="data:image/"]').count(),1);
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
    assert.ok(datos.fotos[datos.ids[0]]?.startsWith('data:image/'),'La fotografía sigue ligada al identificador estable');
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
    assert.equal(await page.locator('#graficoRankingApp .ranking-interactivo').count(), 7);
    assert.equal(await page.locator('#graph image').count(),0,'Los códigos ocultan las fotografías');
    assert.equal(await page.locator('#graficoRankingApp img').count(),0);
    await page.uncheck('#seudonimos');
    assert.equal(await page.locator('#graph image').count(),1);
    assert.equal(await page.locator('#graficoRankingApp img').count(),1);
    assert.equal(await page.locator('#ranking img').count(),1);
    assert.equal(await page.locator('#detalle img').count(),0);
    await page.selectOption('#participante','0');
    assert.equal(await page.locator('#detalle img[src^="data:image/"]').count(),1);
    await page.check('#seudonimos');
    assert.equal(await page.locator('#graph image').count(),0);
    assert.equal(await page.locator('#graficoRankingApp img').count(),0);
    await page.selectOption('#participante','');
    assert.equal(await page.locator('.move-node:enabled').count(), 0);
    await page.selectOption('#participante', '0');
    assert.equal(await page.locator('.move-node:enabled').count(), 4);
    const beforePosition=await page.locator('#graph [data-node="0"]').getAttribute('transform');
    const originalMatrix=JSON.stringify((await state()).datos.matriz);
    await page.locator('[data-move="right"]').click();
    assert.notEqual(await page.locator('#graph [data-node="0"]').getAttribute('transform'),beforePosition);
    assert.equal(JSON.stringify((await state()).datos.matriz),originalMatrix);
    const initialAppView=await page.locator('#graph').getAttribute('viewBox');
    await page.locator('[data-pan="left"]').click();
    assert.notEqual(await page.locator('#graph').getAttribute('viewBox'),initialAppView);
    await page.locator('#ajustar').click();
    assert.equal(await page.locator('#graph').getAttribute('viewBox'),'0 0 1100 690');

    await page.locator('#graficoRankingApp [data-rank-node="0"]').click();
    assert.equal(await page.locator('#graficoRankingApp [data-rank-node="0"]').getAttribute('aria-pressed'),'true');
    await page.locator('#graph [data-node="2"]').click();
    assert.equal(await page.locator('#graficoRankingApp [data-rank-node="2"]').getAttribute('aria-pressed'),'true');
    const json = JSON.parse(fs.readFileSync(await download('#exportJSON', 'copia.json'), 'utf8'));
    assert.deepEqual(json.datos.nombres, Array.from({ length: 7 }, (_, i) => 'P' + (i + 1)));
    assert.deepEqual(json.datos.fotos,{},'La copia seudonimizada nunca incluye fotos');
    const csv = fs.readFileSync(await download('#exportCSV', 'matriz.csv'), 'utf8');
    assert.deepEqual(S.deCSV(csv).matriz, datos.matriz);
    assert.equal(Object.keys(S.deCSV(csv).fotos).length,0,'CSV sin retratos');
    // A04: comprobar los cinco archivos realmente descargados y su contenido.
    const png=fs.readFileSync(await download('#exportPNG','mapa-sociomap.png'));
    assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.ok(png.length>2000);
    const svg=fs.readFileSync(await download('#exportSVG','mapa-sociomap.svg'),'utf8');
    assert.match(svg,/<svg[^>]+/);assert.match(svg,/SOCIOMAP \/ SOCIOGRAMA/);
    assert.match(svg,/P1/);assert.doesNotMatch(svg,/Ana/);
    const report=await PDFDocument.load(fs.readFileSync(await download('#exportPDF','informe-sociomap.pdf')));
    assert.ok(report.getPageCount()>=4);
    assert.equal(report.getTitle(),'SOCIOMAP - Informe sociométrico');
    await page.check('#incluirNombres');
    const named=JSON.parse(fs.readFileSync(await download('#exportJSON','copia-con-nombres.json'),'utf8'));
    assert.deepEqual(named.datos.nombres,names);
    assert.ok(named.datos.fotos[named.datos.ids[0]]?.startsWith('data:image/'));
    const namedSVG=fs.readFileSync(await download('#exportSVG','mapa-con-nombres.svg'),'utf8');
    assert.match(namedSVG,/Ana/);
    assert.match(namedSVG,/<image[^>]+href="data:image\//,'El SVG identificado contiene el retrato');
    const namedPNG=fs.readFileSync(await download('#exportPNG','mapa-identificado.png'));
    assert.equal(namedPNG.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    const namedPDF=await PDFDocument.load(fs.readFileSync(await download('#exportPDF','informe-con-fotos.pdf')));
    assert.ok(namedPDF.getPageCount()>=4);
    console.log('PASS FOTO EXPORT: SVG/PNG/PDF identificados con retrato embebido');
    await page.uncheck('#incluirNombres');
    console.log('PASS EXPORT: PNG, SVG, PDF, JSON, CSV y consentimiento explícito de nombres');
    console.log('PASS 3: sociograma y exportaciones conservados');

    await page.getByRole('link', { name: 'Editar respuestas', exact: true }).click();
    await page.locator('.person-pill').first().click();
    await page.selectOption('[data-sign="+"][data-slot="0"]', '');
    assert.equal(await page.locator('#btnRanking').isDisabled(), true);
    assert.equal((await state()).datos.matriz[0].filter(v => v === '+').length, 2);
    await page.selectOption('[data-sign="+"][data-slot="0"]', '1');
    assert.equal(await page.locator('#btnRanking').isEnabled(), true);
    // A05: la elección de persistencia de la vista se conserva al editar en el formulario.
    await page.click('#btnRanking');
    await page.click('#btnSociograma');
    await page.check('#recordar');
    assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),S.STORAGE_KEY),null);
    assert.ok(await page.evaluate(key=>localStorage.getItem(key),S.STORAGE_KEY));
    await page.getByRole('link',{name:'Editar respuestas',exact:true}).click();
    await page.locator('.person-pill').first().click();
    await page.selectOption('[data-sign="+"][data-slot="0"]','');
    await page.selectOption('[data-sign="+"][data-slot="0"]','1');
    assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),S.STORAGE_KEY),null);
    assert.ok(await page.evaluate(key=>localStorage.getItem(key),S.STORAGE_KEY));
    // A01: una fecha distinta con «Crear grupo» no puede reciclar votos anteriores.
    const nextDate=new Date(Date.parse(datos.fecha+'T12:00:00Z')+86400000).toISOString().slice(0,10);
    await page.fill('#fecha',nextDate);
    await page.click('#crearTabla');
    assert.match(await page.locator('#mensaje').innerText(),/fecha ha cambiado/);
    assert.equal((await state()).datos.fecha,datos.fecha);
    assert.equal(await page.locator('#nuevaMedicion').isEnabled(),true);
    const beforePath=await download('#nuevaMedicion','medicion-anterior.json');
    const oldStudy=JSON.parse(fs.readFileSync(beforePath,'utf8'));
    assert.equal(oldStudy.datos.fecha,datos.fecha);
    assert.deepEqual(oldStudy.datos.matriz,datos.matriz);
    assert.deepEqual(oldStudy.datos.ids,datos.ids);
    assert.ok(oldStudy.datos.fotos[datos.ids[0]],'La copia longitudinal conserva la fotografía');
    const fresh=(await state()).datos;
    assert.equal(fresh.fecha,nextDate);
    assert.deepEqual(fresh.ids,datos.ids);
    assert.equal(fresh.fotos[fresh.ids[0]],datos.fotos[datos.ids[0]],'La foto mantiene identidad entre fechas');
    assert.equal(fresh.cohorte,datos.cohorte);
    assert.ok(fresh.respondidas.every(v=>v===false));
    assert.ok(fresh.matriz.every((row,i)=>row.every((v,j)=>v===(i===j?'0':null))));
    assert.equal(await page.locator('#btnRanking').isDisabled(),true);
    assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),S.STORAGE_KEY),null);
    assert.ok(await page.evaluate(key=>localStorage.getItem(key),S.STORAGE_KEY));
    // Completar una segunda medición del mismo grupo sin alterar las reglas 3+/3−.
    for(let i=0;i<datos.matriz.length;i++){
      await page.locator('.person-pill').nth(i).click();
      for(const [sign,slotValues] of [['+',datos.matriz[i].flatMap((v,j)=>v==='+'?[j]:[])],
                                    ['-',datos.matriz[i].flatMap((v,j)=>v==='-'?[j]:[])]])
        for(let slot=0;slot<3;slot++)
          await page.selectOption('[data-sign="'+sign+'"][data-slot="'+slot+'"]',String(slotValues[slot]));
    }
    assert.equal(await page.locator('#btnRanking').isEnabled(),true);
    await page.click('#btnRanking');await page.click('#btnSociograma');
    await page.locator('#compararArchivo').setInputFiles(beforePath);
    await page.getByText('Mediciones compatibles. Comparación calculada.',{exact:true}).waitFor();
    assert.match(await page.locator('#mensajeComparacion').innerText(),/Mediciones compatibles/);
    assert.match(await page.locator('#comparacion').innerText(),/0 nuevas elecciones positivas/);
    console.log('PASS MEDICIONES: copia anterior, nueva fecha, matriz vacía, continuidad y comparación');
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
    await page.evaluate(() => {
      sessionStorage.setItem('sociomap.config.pendiente','{"nombres":["P1"]}');
      localStorage.setItem('sociomap.config.pendiente','{"nombres":["P1"]}');
    });
    await page.click('#borrarDatos');
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), S.STORAGE_KEY), null);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), S.STORAGE_KEY), null);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('sociomap.config.pendiente')),null);
    assert.equal(await page.evaluate(() => localStorage.getItem('sociomap.config.pendiente')),null);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    assert.deepEqual(consoleErrors, []);
    console.log('PASS 7: diseño móvil, borrado y cero errores de JavaScript');
    console.log('QA_DIR=' + qa);
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });