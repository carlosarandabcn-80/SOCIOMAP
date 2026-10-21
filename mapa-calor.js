'use strict';
(() => {
  const $ = id => document.getElementById(id), loaded = Almacen.leer(), proyecto = loaded.proyecto;
  let data;
  try { if (!proyecto) throw new Error(loaded.error || 'No hay un estudio guardado.'); data = Sociometria.calcular(proyecto.datos); }
  catch (e) { UI.vacio($('estudio'), e.message); return; }
  const vista = proyecto.vista;
  $('seudonimos').checked = vista.seudonimos;
  function dibujar() {
    $('grupoInfo').textContent = `${vista.seudonimos ? 'Grupo seudonimizado' : data.grupo} · ${UI.fecha(data.fecha, data.fechaNoRegistrada)}`;
    Graficos.heatmap(data, $('heatmap'), vista.seudonimos);
  }
  $('seudonimos').addEventListener('change', () => {
    vista.seudonimos = $('seudonimos').checked; dibujar();
    try { Almacen.guardar(proyecto, loaded.persistente); } catch (e) { UI.mensaje('No se pudo guardar la preferencia. ' + e.message, true); }
  });
  const datosExport = () => Sociometria.calcular($('incluirNombres').checked ? proyecto.datos : Sociometria.seudonimizar(proyecto.datos));
  for (const extension of ['PNG', 'SVG', 'CSV']) {
    $('export' + extension).addEventListener('click', async () => {
      const button = $('export' + extension); button.disabled = true;
      try {
        const datos = datosExport();
        if (extension === 'CSV') UI.descargar(Sociometria.aCSV(datos), `sociomap-${datos.fecha}.csv`, 'text/csv;charset=utf-8');
        else await Exportaciones.exportarImagen(extension.toLowerCase(), datos, vista, true);
        UI.mensaje('Archivo preparado para descargar.');
      } catch (e) { UI.mensaje('No se pudo exportar. ' + e.message, true); }
      finally { button.disabled = false; }
    });
  }
  window.addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
  window.addEventListener('storage', e => { if ([Sociometria.STORAGE_KEY, null].includes(e.key)) location.reload(); });
  dibujar();
})();
