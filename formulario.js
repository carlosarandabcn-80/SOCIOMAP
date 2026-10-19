'use strict';
const grupoInput = document.getElementById('grupo');
const customCheckbox = document.getElementById('custom');
const namesInput = document.getElementById('names');
const numSelect = document.getElementById('num');
const tablaDiv = document.getElementById('tabla');
const rankingDiv = document.getElementById('ranking');
const graficoBox = document.getElementById('graficoBox');
const btnRanking = document.getElementById('btnRanking');
const btnSociograma = document.getElementById('btnSociograma');
const chartCanvas = document.getElementById('chart');
const mensaje = document.getElementById('mensaje');
let chart = null;
let tablaActual = null;
let resultado = null;

for (let i = 7; i <= 40; i++) numSelect.add(new Option(i, i));

function limpiarResultados() {
  resultado = null;
  if (chart) chart.destroy();
  chart = null;
  rankingDiv.replaceChildren();
  rankingDiv.style.display = 'none';
  graficoBox.style.display = 'none';
  btnSociograma.style.display = 'none';
  btnSociograma.disabled = true;
  try {
    localStorage.removeItem(Sociometria.STORAGE_KEY);
    localStorage.removeItem('grupoNombre'); // Retirar el dato separado del formato antiguo.
  } catch {
    mensaje.textContent = 'El navegador no permite acceder al almacenamiento. No se podrá abrir el sociograma.';
  }
}

function habilitarRanking(ok) {
  btnRanking.disabled = !ok;
  btnRanking.classList.toggle('btn-disabled', !ok);
}

function invalidarTabla() {
  mensaje.textContent = '';
  limpiarResultados();
  tablaActual = null;
  tablaDiv.replaceChildren();
  habilitarRanking(false);
}

customCheckbox.onchange = () => {
  namesInput.style.display = customCheckbox.checked ? 'block' : 'none';
  invalidarTabla();
};
[grupoInput, namesInput].forEach(input => input.addEventListener('input', invalidarTabla));
numSelect.addEventListener('change', invalidarTabla);

function crearTabla() {
  invalidarTabla();
  try {
    const total = Number(numSelect.value);
    if (!Number.isInteger(total) || total < 7 || total > 40) throw new Error('Elige entre 7 y 40 participantes.');
    if (!grupoInput.value.trim()) throw new Error('Debes indicar el nombre del grupo.');
    const grupo = Sociometria.normalizarNombre(grupoInput.value);
    const nombres = Sociometria.validarNombres(customCheckbox.checked
      ? namesInput.value.split(',')
      : Array.from({ length: total }, (_, i) => 'P' + (i + 1)));
    if (nombres.length !== total) throw new Error('La cantidad de nombres no coincide con el número indicado.');
    tablaActual = { version: 1, grupo, nombres };
    const esc = Sociometria.escaparHTML;
    let html = '<table id="tablaVotos"><thead><tr><th>De\\A</th>';
    nombres.forEach(n => { html += `<th>${esc(n)}</th>`; });
    html += '<th>✔</th></tr></thead><tbody>';
    nombres.forEach((name, i) => {
      html += `<tr><th>${esc(name)}</th>`;
      nombres.forEach((target, j) => {
        html += i === j ? '<td></td>' : `<td><select class="cell" data-source="${i}" data-target="${j}" aria-label="${esc(name)} a ${esc(target)}"><option>0</option><option>+</option><option>-</option></select></td>`;
      });
      html += `<td id="check${i}" class="check-ok"></td></tr>`;
    });
    tablaDiv.innerHTML = html + '</tbody></table>';
    tablaDiv.querySelectorAll('.cell').forEach(cell => cell.addEventListener('change', () => {
      mensaje.textContent = '';
      limpiarResultados();
      validarTabla();
    }));
    validarTabla();
  } catch (error) {
    mensaje.textContent = error.message;
  }
}

function leerTabla() {
  if (!tablaActual) throw new Error('Crea y completa la tabla antes de continuar.');
  const n = tablaActual.nombres.length;
  const rows = tablaDiv.querySelectorAll('#tablaVotos tbody tr');
  if (rows.length !== n) throw new Error('La matriz está incompleta.');
  const matriz = Array.from(rows, (row, i) => {
    const cells = row.querySelectorAll('select');
    if (cells.length !== n - 1) throw new Error('La matriz está incompleta.');
    const values = Array(n);
    values[i] = '0';
    cells.forEach(cell => {
      const j = Number(cell.dataset.target);
      if (cell.dataset.source !== String(i) || !Number.isInteger(j) || j < 0 || j >= n || values[j] !== undefined) {
        throw new Error('La matriz contiene destinatarios inválidos.');
      }
      values[j] = cell.value;
    });
    return values;
  });
  return Sociometria.validarDatos({ ...tablaActual, matriz });
}

function validarTabla() {
  tablaDiv.querySelectorAll('#tablaVotos tbody tr').forEach((row, i) => {
    const values = Array.from(row.querySelectorAll('select'), s => s.value);
    const ok = values.length === tablaActual.nombres.length - 1 && values.every(v => ['0', '+', '-'].includes(v)) &&
      values.filter(v => v === '+').length === 3 && values.filter(v => v === '-').length === 3;
    document.getElementById('check' + i).textContent = ok ? '✔' : '';
  });
  try { leerTabla(); habilitarRanking(true); return true; }
  catch { habilitarRanking(false); return false; }
}

function procesar() {
  mensaje.textContent = '';
  limpiarResultados();
  let data;
  try { data = Sociometria.calcular(leerTabla()); }
  catch (error) { mensaje.textContent = error.message; habilitarRanking(false); return; }
  resultado = Sociometria.validarDatos(data);
  const headers = data.nombres;
  const pos = data.nodes.map(n => n.recPos);
  const neg = data.nodes.map(n => n.recNeg);
  let html = '<table><tr><th>Nombre</th><th>+</th><th>-</th><th>Rol</th></tr>';
  data.nodes.forEach(node => {
    const rol = calcularRol(node.recPos, node.recNeg);
    html += `<tr class="role-${rol.toLowerCase()}"><td>${Sociometria.escaparHTML(node.name)}</td><td>${node.recPos}</td><td>${node.recNeg}</td><td>${rol}</td></tr>`;
  });
  rankingDiv.innerHTML = html + '</table>';
  rankingDiv.style.display = 'block';
  try {
    graficoBox.style.display = 'block';
    chart = new Chart(chartCanvas, {
      type: 'bar',
      data: { labels: headers, datasets: [
        { label: 'Votos +', data: pos, backgroundColor: '#22c55e' },
        { label: 'Votos -', data: neg, backgroundColor: '#ef4444' }
      ] },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
  } catch {
    graficoBox.style.display = 'none';
    mensaje.textContent = 'No se pudo cargar el gráfico de barras. El ranking sigue disponible.';
  }
  btnSociograma.disabled = false;
  btnSociograma.style.display = 'inline-block';
}

function calcularRol(p, n) {
  if (p > 3 && n <= 1) return 'Lider';
  if (n > 3) return 'Rechazado';
  if (p === 0) return 'Aislado';
  if (p >= 2 && n >= 2) return 'Ambivalente';
  return 'Integrado';
}

function irASociograma() {
  try {
    const data = leerTabla();
    if (!resultado || JSON.stringify(data) !== JSON.stringify(resultado)) {
      limpiarResultados();
      throw new Error('Vuelve a crear el ranking después de editar la tabla.');
    }
    localStorage.setItem(Sociometria.STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    mensaje.textContent = 'No se pudo abrir el sociograma. ' + error.message;
    return;
  }
  window.location.href = 'sociograma_interactivo.html';
}

// Incluye la restauración desde la caché del navegador al volver atrás.
window.addEventListener('pageshow', () => { limpiarResultados(); validarTabla(); });
