const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const pages = ['index.html', 'acceso.html', 'formulario.html', 'sociograma_interactivo.html', 'instrucciones.html', 'demo.html'];
test('las seis páginas tienen idioma, viewport, CSP y vínculos locales existentes', () => {
  for (const page of pages) {
    const source = fs.readFileSync(path.join(root, page), 'utf8');
    assert.match(source, /lang="es"/); assert.match(source, /name="viewport"/); assert.match(source, /Content-Security-Policy/);
    assert.match(source, /class="skip"/); assert.match(source, /id="contenido"/);
    for (const match of source.matchAll(/(?:href|src)="([^"#]+)"/g)) {
      const target = match[1]; if (/^https?:/.test(target)) continue;
      assert.ok(fs.existsSync(path.join(root, target.split('#')[0])), `${page}: vínculo inexistente ${target}`);
    }
    assert.ok(!/on(?:click|change|load)=/.test(source), page + ': manejador inline');
    assert.ok(!/<script[^>]*src="https?:/.test(source), page + ': script externo');
  }
});
test('el código propio no usa sumideros HTML ni dependencias de CDN', () => {
  for (const file of fs.readdirSync(root).filter(n => n.endsWith('.js'))) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(!/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML|document\.write\s*\(|\beval\s*\(/.test(source), file + ': sumidero HTML');
    execFileSync(process.execPath, ['--check', path.join(root, file)]);
  }
});

test('archivo de demo coincide con el motor público 3+3', () => {
  const S = require('../sociometria.js');
  const archivo = JSON.parse(fs.readFileSync(path.join(root, 'demo.json'), 'utf8'));
  const esperado = S.demoPublica();
  assert.deepEqual(S.calcular(archivo.datos).nodes.map(n => [n.recPos,n.recNeg]),
    S.calcular(esperado).nodes.map(n => [n.recPos,n.recNeg]));
  assert.deepEqual(archivo.datos.matriz, esperado.matriz);
});
