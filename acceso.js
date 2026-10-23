'use strict';
(() => {
 const $=id=>document.getElementById(id);
 for(let n=7;n<=40;n++) $('num').add(new Option(n,n));
 $('num').value='7';$('fecha').value=UI.hoy();
 const existing=Almacen.leer().proyecto?.datos;
 if(existing && existing.nombres.length>=7){
  $('grupo').value=existing.grupo;$('num').value=existing.nombres.length;
  $('fecha').value=existing.fecha;$('criterio').value=existing.criterio;
  const custom=existing.nombres.some((s,i)=>s!=='P'+(i+1));
  $('custom').checked=custom;$('namesBox').hidden=!custom;
  if(custom){$('names').value=existing.nombres.join('\n');document.querySelector('.simple-details').open=true;}
 }
 $('custom').addEventListener('change',()=>{$('namesBox').hidden=!$('custom').checked;});
 function config(){
  const n=Number($('num').value);
  let nombres=Array.from({length:n},(_,i)=>'P'+(i+1));
  if($('custom').checked){
   const raw=$('names').value.trim();
   nombres=Sociometria.validarNombres(raw.includes('\n')?raw.split(/\r?\n/):raw.split(','));
   if(nombres.length!==n) throw Error('Introduce '+n+' nombres, uno por línea.');
  }
  if(!$('grupo').value.trim())throw Error('Indica el nombre del grupo.');
  if(!$('criterio').value.trim())throw Error('Indica una pregunta.');
  if(!$('fecha').value)throw Error('Selecciona una fecha.');
  return {grupo:$('grupo').value.trim(),nombres,fecha:$('fecha').value,criterio:$('criterio').value.trim(),reglas:{positivos:3,negativos:3,modo:'exactos'}};
 }
 function error(e){UI.mensaje(e.message,true);}
 $('descargarPDF').addEventListener('click',async()=>{
  const b=$('descargarPDF');
  try{const cfg=config();b.disabled=true;b.textContent='Preparando PDF…';
   const paginas=await CuestionarioPDF.descargar(cfg);UI.mensaje(paginas+' hojas generadas, una por participante.');
  }catch(e){error(e);}finally{b.disabled=false;b.textContent='Descargar PDF de votaciones ↓';}
 });
 $('irTabla').addEventListener('click',()=>{
  try{const cfg=config();sessionStorage.setItem('sociomap.config.pendiente',JSON.stringify(cfg));
   location.href='formulario.html';
  }catch(e){error(e);}
 });
})();