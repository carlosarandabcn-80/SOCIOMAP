'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const S=require('../sociometria.js');
const clone=value=>JSON.parse(JSON.stringify(value));
function store(){
 const values=new Map();
 return {
  getItem:key=>values.has(key)?values.get(key):null,
  setItem:(key,value)=>{values.set(key,String(value));},
  removeItem:key=>values.delete(key),
  clear:()=>values.clear()
 };
}
function storageHarness(){
 const sessionStorage=store(),localStorage=store();
 const ctx=vm.createContext({Sociometria:S,sessionStorage,localStorage});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../almacenamiento.js'),'utf8'),ctx,{filename:'almacenamiento.js'});
 return {Almacen:ctx.Almacen,sessionStorage,localStorage};
}

test('A01: nueva medición conserva identidad, criterio y cuota 3+/3−, nunca los votos',()=>{
 const anterior=S.demoPublica(),before=clone(anterior),proxima=S.nuevaMedicion(anterior,'2026-10-31');
 assert.equal(proxima.fecha,'2026-10-31');
 assert.equal(proxima.cohorte,anterior.cohorte);
 assert.deepEqual(proxima.ids,anterior.ids);
 assert.deepEqual(proxima.nombres,anterior.nombres);
 assert.deepEqual(proxima.reglas,{positivos:3,negativos:3,modo:'exactos'});
 assert.deepEqual(proxima.respondidas,Array(8).fill(false));
 assert.ok(proxima.matriz.every((row,i)=>row.every((v,j)=>v===(i===j?'0':null))));
 assert.deepEqual(anterior,before,'la medición original no se modifica');
 assert.throws(()=>S.calcular(proxima),/al menos una respuesta/);
 assert.doesNotThrow(()=>S.validarDatos(proxima,{borrador:true}));
});

test('A01: se bloquean fechas inválidas, anteriores, repetidas y mediciones incompletas',()=>{
 const d=S.demoPublica();
 for(const date of ['2026-10-24','2026-10-23','2026-02-30','vacío',null])
  assert.throws(()=>S.nuevaMedicion(d,date));
 const missing=clone(d);missing.respondidas[0]=false;
 missing.matriz[0]=missing.matriz[0].map((v,i)=>i===0?'0':null);
 assert.throws(()=>S.nuevaMedicion(missing,'2026-10-31'),/Completa/);
 const unknown=clone(d);unknown.fechaNoRegistrada=true;
 assert.throws(()=>S.nuevaMedicion(unknown,'2026-10-31'),/histórica/);
});

test('A01: las dos mediciones siguen siendo comparables al completar la nueva matriz',()=>{
 const old=S.demoPublica(),next=S.nuevaMedicion(old,'2026-10-31');
 next.matriz=clone(old.matriz);next.respondidas.fill(true);
 const result=S.comparar(next,old);
 assert.equal(result.altas,0);assert.equal(result.bajas,0);
 assert.equal(result.paresMutPos,0);assert.equal(result.fechaAnterior,old.fecha);
 assert.equal(result.fechaActual,next.fecha);
});

test('A03: borrar elimina proyecto, datos legados y configuración pendiente en ambos almacenamientos',()=>{
 const {Almacen,sessionStorage,localStorage}=storageHarness();
 for(const storage of [sessionStorage,localStorage]){
  for(const key of [S.STORAGE_KEY,'sociogramaData','grupoNombre','sociomap.config.pendiente'])storage.setItem(key,'dato sensible');
  storage.setItem('sociograma.accesibilidad','preferencias');
 }
 Almacen.borrar();
 for(const storage of [sessionStorage,localStorage]){
  for(const key of [S.STORAGE_KEY,'sociogramaData','grupoNombre','sociomap.config.pendiente'])assert.equal(storage.getItem(key),null);
  assert.equal(storage.getItem('sociograma.accesibilidad'),'preferencias');
 }
});

test('A05: el estudio se mantiene cuando el soporte alternativo falla y se respeta la opción recordar',()=>{
 const {Almacen,sessionStorage,localStorage}=storageHarness();
 const data=S.demoPublica();
 Almacen.guardar({datos:data},true);
 assert.equal(Almacen.leer().persistente,true);
 assert.equal(sessionStorage.getItem(S.STORAGE_KEY),null);
 const next=S.nuevaMedicion(data,'2026-10-31');
 Almacen.guardar({datos:next},true);
 assert.equal(Almacen.leer().persistente,true);
 assert.equal(Almacen.leer().proyecto.datos.fecha,'2026-10-31');
 Almacen.guardar({datos:next},false);
 assert.equal(Almacen.leer().persistente,false);
 assert.equal(localStorage.getItem(S.STORAGE_KEY),null);
 assert.ok(sessionStorage.getItem(S.STORAGE_KEY));
});
