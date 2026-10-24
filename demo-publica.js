'use strict';
(() => {
 const S=Sociometria,n=8;
 const datos=S.demoPublica();
 const d=S.calcular(datos),svg=document.getElementById('grafoDemo'),ns='http://www.w3.org/2000/svg';
 let selected=null,drag=null;
 const coords=Array.from({length:n},(_,i)=>{const a=2*Math.PI*i/n-Math.PI/2;return [405+245*Math.cos(a),330+238*Math.sin(a)]});
 function el(tag,attrs={},v=''){const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,x])=>e.setAttribute(k,x));if(v)e.textContent=v;return e}
 const defs=el('defs');[['pos','#0965f5'],['neg','#cb793d']].forEach(([id,color])=>{const m=el('marker',{id,viewBox:'0 0 10 10',refX:8,refY:5,markerWidth:5,markerHeight:5,orient:'auto'});m.append(el('path',{d:'M0 0L10 5L0 10Z',fill:color}));defs.append(m)});svg.append(defs);const scene=el('g');svg.append(scene);
 function draw(){scene.replaceChildren();const filter=document.getElementById('filtroDemo').value;for(const link of d.links){if(filter!=='todos'&&filter!==link.type)continue;const a=coords[link.source],b=coords[link.target],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),positive=link.type==='+';scene.append(el('line',{x1:a[0]+dx*32/len,y1:a[1]+dy*32/len,x2:b[0]-dx*41/len,y2:b[1]-dy*41/len,stroke:positive?'#0965f5':'#cb793d','stroke-width':positive?2.4:2,'stroke-dasharray':positive?'none':'6 7',opacity:positive?.52:.46,'marker-end':positive?'url(#pos)':'url(#neg)'}))}
 for(let i=0;i<n;i++){const [x,y]=coords[i],g=el('g',{'data-demo-node':i,tabindex:0,role:'button','aria-pressed':String(selected===i),'aria-label':'P'+(i+1)+', '+d.nodes[i].recPos+' positivas recibidas'+', mover con flechas del teclado',class:selected===i?'selected':''});g.append(el('circle',{cx:x,cy:y,r:33,fill:i===0?'#0965f5':'#fff',stroke:'#7095c2','stroke-width':3}));g.append(el('text',{x,y:y+5,'text-anchor':'middle','font-size':17,'font-weight':700,fill:i===0?'white':'#081b33'},'P'+(i+1)));scene.append(g)}}
 document.getElementById('filtroDemo').addEventListener('change',draw);draw();
 function select(i,focus=false){selected=i;draw();document.querySelectorAll('.demo-move').forEach(b=>{b.disabled=false});AnalisisRelacional.destacar(document.getElementById('graficoRankingDemo'),selected);const person=d.nodes[i];document.getElementById('detalleDemo').textContent='P'+(i+1)+': '+person.recPos+' elecciones positivas y '+person.recNeg+' negativas recibidas; '+person.mutPos+' reciprocidades positivas.';if(focus)svg.querySelector('[data-demo-node="'+i+'"]')?.focus();}
 function coord(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());}
 svg.addEventListener('pointerdown',e=>{const g=e.target.closest('[data-demo-node]');if(!g||e.button!==0)return;const i=Number(g.getAttribute('data-demo-node'));select(i);drag={i,p:coord(e),start:[...coords[i]],pointer:e.pointerId};svg.setPointerCapture(e.pointerId);e.preventDefault();});
 svg.addEventListener('pointermove',e=>{if(!drag||drag.pointer!==e.pointerId)return;const p=coord(e),i=drag.i;coords[i]=[Math.max(45,Math.min(765,drag.start[0]+p.x-drag.p.x)),Math.max(45,Math.min(615,drag.start[1]+p.y-drag.p.y))];draw();});
 function end(e){if(drag&&e.pointerId===drag.pointer){drag=null;if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);}}
 svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
 svg.addEventListener('keydown',e=>{const g=e.target.closest('[data-demo-node]');if(!g)return;const i=Number(g.getAttribute('data-demo-node'));if(e.key==='Enter'||e.key===' '){e.preventDefault();select(i,true);}else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const step=e.shiftKey?25:12;coords[i][0]=Math.max(45,Math.min(765,coords[i][0]+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0)));coords[i][1]=Math.max(45,Math.min(615,coords[i][1]+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)));select(i,true);}});
 // Reposicionamiento accesible sin arrastrar, por clic o toque.
 document.querySelectorAll('.demo-move').forEach(button=>button.addEventListener('click',()=>{
   if(selected===null)return;
   const steps={left:[-24,0],right:[24,0],up:[0,-24],down:[0,24]};
   const [dx,dy]=steps[button.dataset.demoMove]||[0,0];
   if(!dx&&!dy)return;
   coords[selected][0]=Math.max(45,Math.min(765,coords[selected][0]+dx));
   coords[selected][1]=Math.max(45,Math.min(615,coords[selected][1]+dy));
   select(selected);
 }));
 function zoom(factor){const box=svg.viewBox.baseVal;const w=Math.max(270,Math.min(1400,box.width*factor));const h=w*660/810;svg.setAttribute('viewBox',[box.x+(box.width-w)/2,box.y+(box.height-h)/2,w,h].join(' '));}
 document.getElementById('demoZoomMas').addEventListener('click',()=>zoom(.8));
 document.getElementById('demoZoomMenos').addEventListener('click',()=>zoom(1.25));
 document.getElementById('demoZoomAjustar').addEventListener('click',()=>svg.setAttribute('viewBox','0 0 810 660'));
 document.getElementById('restablecerDemo').addEventListener('click',()=>{coords.splice(0,n,...Array.from({length:n},(_,i)=>{const a=2*Math.PI*i/n-Math.PI/2;return [405+245*Math.cos(a),330+238*Math.sin(a)]}));selected=null;document.querySelectorAll('.demo-move').forEach(b=>{b.disabled=true});document.getElementById('detalleDemo').textContent='Posiciones originales recuperadas.';draw();AnalisisRelacional.destacar(document.getElementById('graficoRankingDemo'),null);});
 AnalisisRelacional.insertar(document.getElementById('descripcionDemo'),d);
 AnalisisRelacional.grafico(document.getElementById('graficoRankingDemo'),d,i=>{select(i);svg.scrollIntoView({behavior:'smooth',block:'center'});});
 const rank=[...d.nodes].sort((a,b)=>b.recPos-a.recPos||a.recNeg-b.recNeg||a.id-b.id);
 document.getElementById('rankingDemo').replaceChildren(UI.tabla(['Participante','Positivas recibidas','Negativas recibidas','Reciprocidades positivas'],rank.map(x=>['P'+(x.id+1),String(x.recPos),String(x.recNeg),String(x.mutPos)]),'Resultados del caso ficticio'));
 for(const [id,v] of [['demoPersonas',n],['demoPos',d.metricas.totalPos],['demoNeg',d.metricas.totalNeg],['demoMut',d.metricas.paresMutPos]])document.getElementById(id).textContent=v;
})();