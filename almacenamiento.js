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
    const destino = persistente ? localStorage : sessionStorage;
    const otro = persistente ? sessionStorage : localStorage;
    const anterior = destino.getItem(key);
    // La copia anterior sigue disponible si falla la escritura o el cambio de soporte.
    destino.setItem(key, json);
    try { otro.removeItem(key); }
    catch (error) {
      if (anterior === null) destino.removeItem(key);
      else destino.setItem(key, anterior);
      throw error;
    }
    localStorage.removeItem('sociogramaData'); localStorage.removeItem('grupoNombre');
    return proyecto;
  }
  function borrar() {
    const errors = [];
    for (const type of ['sessionStorage', 'localStorage']) {
      try { for (const item of [key, 'sociogramaData', 'grupoNombre', 'sociomap.config.pendiente']) root[type].removeItem(item); }
      catch (e) { errors.push(e.message); }
    }
    if (errors.length) throw new Error('El navegador ha bloqueado parte del borrado. Usa también sus ajustes para eliminar los datos de este sitio.');
  }
  root.Almacen = { leer, guardar, borrar };
})(globalThis);
