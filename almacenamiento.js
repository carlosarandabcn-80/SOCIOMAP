(function (root) {
  'use strict';
  const S = root.Sociometria, key = S.STORAGE_KEY;
  function leer() {
    let raw, persistente = false, error;
    try { raw = sessionStorage.getItem(key); } catch (e) { error = e; }
    if (!raw) { try { raw = localStorage.getItem(key); persistente = Boolean(raw); } catch (e) { error = e; } }
    if (!raw) {
      try { const legacy = localStorage.getItem('sociogramaData'); if (legacy) return { proyecto: S.validarProyecto(JSON.parse(legacy)), persistente: false, legado: true }; } catch (e) { error = e; }
      return { proyecto: null, persistente: false, error: error?.message };
    }
    try { return { proyecto: S.validarProyecto(JSON.parse(raw)), persistente }; }
    catch (e) { return { proyecto: null, persistente, error: 'No se pudo recuperar el estudio: ' + e.message }; }
  }
  function guardar(input, persistente = false) {
    const proyecto = S.validarProyecto(input), json = JSON.stringify(proyecto);
    // Escribir antes de retirar el otro soporte: un fallo de cuota no destruye la copia anterior.
    if (persistente) { localStorage.setItem(key, json); sessionStorage.removeItem(key); }
    else { sessionStorage.setItem(key, json); localStorage.removeItem(key); }
    localStorage.removeItem('sociogramaData'); localStorage.removeItem('grupoNombre');
    return proyecto;
  }
  function borrar() {
    const errors = [];
    for (const type of ['sessionStorage', 'localStorage']) {
      try { for (const item of [key, 'sociogramaData', 'grupoNombre']) root[type].removeItem(item); }
      catch (e) { errors.push(e.message); }
    }
    if (errors.length) throw new Error('El navegador ha bloqueado parte del borrado. Usa también sus ajustes para eliminar los datos de este sitio.');
  }
  root.Almacen = { leer, guardar, borrar };
})(globalThis);
