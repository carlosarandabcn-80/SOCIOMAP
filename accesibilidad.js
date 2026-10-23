'use strict';
(() => {
 const root=document.documentElement;
 const $=id=>document.getElementById(id);
 const open=$('abrirAccesibilidad'), panel=$('panelAccesibilidad');
 if(!open||!panel)return;
 const values={large:false,contrast:false,motion:false};
 try { Object.assign(values,JSON.parse(localStorage.getItem('sociograma.accesibilidad')||'{}')); } catch {}
 const save=()=>{try{localStorage.setItem('sociograma.accesibilidad',JSON.stringify(values));}catch{}};
 const render=()=>{
  root.classList.toggle('a11y-large',values.large);
  root.classList.toggle('a11y-contrast',values.contrast);
  root.classList.toggle('a11y-motion',values.motion);
  $('tamanoTexto').textContent=values.large?'Tamaño de texto normal':'Texto más grande';
  $('tamanoTexto').setAttribute('aria-pressed',String(values.large));
  $('altoContraste').setAttribute('aria-pressed',String(values.contrast));
  $('reducirMovimiento').setAttribute('aria-pressed',String(values.motion));
 };
 const close=()=>{panel.hidden=true;open.setAttribute('aria-expanded','false');};
 open.addEventListener('click',()=>{panel.hidden=!panel.hidden;open.setAttribute('aria-expanded',String(!panel.hidden));});
 $('tamanoTexto').addEventListener('click',()=>{values.large=!values.large;render();save();});
 $('altoContraste').addEventListener('click',()=>{values.contrast=!values.contrast;render();save();});
 $('reducirMovimiento').addEventListener('click',()=>{values.motion=!values.motion;render();save();});
 $('restablecerAccesibilidad').addEventListener('click',()=>{values.large=values.contrast=values.motion=false;render();save();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){close();open.focus();}});
 document.addEventListener('pointerdown',e=>{if(!panel.hidden&&!e.target.closest('.accessibility-controls'))close();});
 render();
})();
