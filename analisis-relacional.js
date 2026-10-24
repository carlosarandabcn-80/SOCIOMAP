'use strict';
/* Interpretación descriptiva compartida: nunca infiere diagnósticos personales. */
window.AnalisisRelacional = (() => {
  const etiqueta = n => 'P' + (n.id + 1);
  function resumen(data) {
    const nodes = data.nodes, m = data.metricas;
    if (!nodes.length) return ['No hay participantes para analizar.'];
    const max = Math.max(...nodes.map(n => n.recPos));
    const leaders = nodes.filter(n => n.recPos === max).map(etiqueta);
    const sinPos = nodes.filter(n => n.recPos === 0).map(etiqueta);
    const cobertura = m.respuestas + ' de ' + m.participantes + ' personas';
    return [
      'Datos observados: ' + cobertura + ' han respondido. Se registran ' + m.totalPos +
        ' elecciones positivas y ' + m.totalNeg + ' negativas. Las elecciones no emitidas no se computan como rechazos.',
      'Indicadores calculados: máximo de ' + max + ' elecciones positivas recibidas (' +
        leaders.join(', ') + '). ' + (leaders.length > 1 ? 'Existe un empate en este indicador.' :
          'Es el valor máximo observado, no una clasificación de valor personal.'),
      'Relaciones recíprocas: ' + m.paresMutPos + ' pares se eligen mutuamente en sentido positivo. ' +
        (sinPos.length ? 'Sin elecciones positivas recibidas: ' + sinPos.join(', ') +
          '. Esta ausencia no demuestra aislamiento.' : 'Todas las personas han recibido al menos una elección positiva.') ,
      'Límites de interpretación: los resultados dependen de la pregunta, del momento y de la participación. ' +
        'No permiten deducir liderazgo, bienestar, causas ni diagnósticos. Las hipótesis socioeducativas requieren contraste profesional.'
    ];
  }
  function insertar(container, data) {
    container.replaceChildren(...resumen(data).map(t => UI.el('p', {}, t)));
  }
  function grafico(container, data, seleccionar, nombre = etiqueta) {
    const list = [...data.nodes].sort((a, b) => b.recPos - a.recPos || a.id - b.id);
    const max = Math.max(1, ...list.flatMap(n => [n.recPos, n.recNeg]));
    container.replaceChildren(...list.map(n => {
      const label = nombre(n);
      const btn = UI.el('button', {
        type: 'button', className: 'ranking-interactivo', 'data-rank-node': n.id,
        'aria-pressed': 'false',
        'aria-label': 'Seleccionar ' + label + ': ' + n.recPos +
          ' elecciones positivas y ' + n.recNeg + ' negativas recibidas'
      }, UI.el('span', { className: 'ranking-persona' }, label),
      UI.el('span', { className: 'ranking-barras' },
        UI.el('span', { className: 'ranking-bar positiva',
          style: 'width:' + Math.round(100 * n.recPos / max) + '%' }, '+' + n.recPos),
        UI.el('span', { className: 'ranking-bar negativa',
          style: 'width:' + Math.round(100 * n.recNeg / max) + '%' }, '−' + n.recNeg)));
      btn.addEventListener('click', () => seleccionar(n.id));
      return btn;
    }));
  }
  function destacar(container, id) {
    if (!container) return;
    container.querySelectorAll('[data-rank-node]').forEach(button => {
      const active = id !== null && Number(button.dataset.rankNode) === id;
      button.classList.toggle('seleccionado', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }
  return { resumen, insertar, grafico, destacar };
})();
