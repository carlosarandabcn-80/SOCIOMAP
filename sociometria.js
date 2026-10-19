(function (root) {
  'use strict';
  const STORAGE_KEY = 'sociogramaData';
  function normalizarNombre(value) {
    if (typeof value !== 'string') throw new Error('Cada nombre debe ser texto.');
    const name = value.normalize('NFC').trim().replace(/\s+/g, ' ');
    if (!name || /[\u0000-\u001f\u007f]/.test(name)) throw new Error('Hay nombres vacíos o inválidos.');
    return name;
  }
  function validarNombres(names) {
    if (!Array.isArray(names) || names.length < 7 || names.length > 40) {
      throw new Error('El grupo debe tener entre 7 y 40 participantes.');
    }
    const normalized = Array.from(names, normalizarNombre);
    if (new Set(normalized.map(n => n.toLocaleLowerCase('es'))).size !== normalized.length) {
      throw new Error('No se permiten nombres duplicados (tampoco con distintas mayúsculas o espacios).');
    }
    return normalized;
  }
  function validarDatos(data) {
    if (!data || data.version !== 1) throw new Error('Formato de datos no compatible. Vuelve a crear el ranking.');
    const grupo = normalizarNombre(data.grupo);
    const nombres = validarNombres(data.nombres);
    const n = nombres.length;
    if (!Array.isArray(data.matriz) || data.matriz.length !== n) throw new Error('La matriz está incompleta.');
    const matriz = Array.from(data.matriz, (row, i) => {
      if (!Array.isArray(row) || row.length !== n) throw new Error('La matriz está incompleta.');
      const values = Array.from(row, (value, j) => {
        if (!['0', '+', '-'].includes(value)) throw new Error('La matriz contiene votos inválidos.');
        if (i === j && value !== '0') throw new Error('No se permiten votos a uno mismo.');
        return value;
      });
      if (values.filter(v => v === '+').length !== 3 || values.filter(v => v === '-').length !== 3) {
        throw new Error(`La fila de ${nombres[i]} debe tener exactamente 3 + y 3 −.`);
      }
      return values;
    });
    return { version: 1, grupo, nombres, matriz };
  }
  function calcular(data) {
    const valid = validarDatos(data);
    const nodes = valid.nombres.map((name, id) => ({ id, name, recPos: 0, recNeg: 0 }));
    const links = [];
    valid.matriz.forEach((row, source) => row.forEach((type, target) => {
      if (type === '0') return;
      nodes[target][type === '+' ? 'recPos' : 'recNeg']++;
      links.push({ source, target, type });
    }));
    return { ...valid, nodes, links };
  }
  function escaparHTML(value) {
    return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const api = { STORAGE_KEY, normalizarNombre, validarNombres, validarDatos, calcular, escaparHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Sociometria = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
