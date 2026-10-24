'use strict';
window.AnalisisRelacional = (() => {
 function resumen(data) {
  const nodes=data.nodes, max=Math.max(...nodes.map(n=>n.recPos)), leaders=nodes.filter(n=>n.recPos===max);
  const isolated=nodes.filter(n=>n.recPos===0), m=data.metricas;
  const nombre=n=>'P'+(n.id+1);
  return [
   'Se registran '+m.totalPos+' elecciones positivas y '+m.totalNeg+' negativas de '+m.respuestas+' respuestas de '+m.participantes+' participantes.',
   'Mayor número de elecciones positivas recibidas ('+max+'): '+leaders.map(nombre).join(', ')+'. '+(leaders.length>1?'Hay empate; el ranking no debe interpretarse como una clasificación de valor personal.':'Es el valor máximo observado en este grupo.'),
   'Reciprocidad positiva: '+m.paresMutPos+' pares de participantes se eligen mutuamente. '+(isolated.length?'Sin elecciones positivas recibidas: '+isolated.map(nombre).join(', ')+'. Esto no demuestra aislamiento social.':'Todas las personas han recibido alguna elección positiva.'),
   'Estas cifras describen elecciones bajo un criterio concreto y no identifican causas, diagnósticos ni necesidades individuales por sí solas.'
  ];
 }
 function insertar(container,data){container.replaceChildren(...resumen(data).map(t=>UI.el('p',{},t)));}
 function grafico(container,data,seleccionar) {
  const list=[...data.nodes].sort((a,b)=>b.recPos-a.recPos||a.id-b.id),max=Math.max(1,...list.map(n=>n.recPos,n=>n.recNeg));
  container.replaceChildren(...list.map(n=>{
   const btn=UI.el('button',{type:'button',className:'ranking-interactivo','aria-label':'Seleccionar P'+(n.id+1)+'. '+n.recPos+' elecciones positivas, '+n.recNeg+' negativas recibidas'},
    UI.el('span',{className:'ranking-persona'},'P'+(n.id+1)),
    UI.el('span',{className:'ranking-barras'},
     UI.el('span',{className:'ranking-bar positiva',style:'width:'+Math.round(100*n.recPos/max)+'%'},'+'+n.recPos),
     UI.el('span',{className:'ranking-bar negativa',style:'width:'+Math.round(100*n.recNeg/max)+'%'},'−'+n.recNeg))
   );
   btn.addEventListener('click',()=>seleccionar(n.id));return btn;
  }));
 }
 return {resumen,insertar,grafico};
})();