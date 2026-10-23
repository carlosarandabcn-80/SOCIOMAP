'use strict';
// Plantilla universal y reproducible: un A4, dos cuestionarios A5 apaisados.
window.CuestionarioPDF = (() => {
  let cargar = null;
  async function motor() {
    if (window.PDFLib && window.fontkit) return window.PDFLib;
    if (!cargar) cargar = Promise.all([['PDFLib','vendor/pdf-lib.min.js'],['fontkit','vendor/fontkit.umd.min.js']].map(([key,url])=>{
      if (window[key]) return Promise.resolve();
      return new Promise((resolve,reject)=>{ const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>reject(new Error('No se puede cargar el motor PDF.'));document.head.append(s); });
    })).then(()=>window.PDFLib).catch(e=>{cargar=null;throw e;});
    return cargar;
  }
  async function descargar() {
    const lib=await motor();
    const doc=await lib.PDFDocument.create();
    doc.setTitle('SOCIOGRAMA - Hoja estándar de recogida de votos (2 cuestionarios por A4)');
    doc.setAuthor('SOCIOGRAMA · ARANDA TOOLS');
    doc.registerFontkit(window.fontkit);
    const [font,bold]=await Promise.all(['DejaVuSans.ttf','DejaVuSans-Bold.ttf'].map(async(n,i)=>{
      const r=await fetch('vendor/'+n);if(!r.ok)throw new Error('Faltan las fuentes para crear el PDF.');
      return doc.embedFont(await r.arrayBuffer(),{subset:true});
    }));
    const page=doc.addPage([595.28,841.89]);
    const ink=lib.rgb(.055,.105,.19),slate=lib.rgb(.27,.34,.44),blue=lib.rgb(.015,.38,.98),soft=lib.rgb(.90,.94,.98),white=lib.rgb(1,1,1);
    const line=(x1,y1,x2,y2,color=soft,w=1)=>page.drawLine({start:{x:x1,y:y1},end:{x:x2,y:y2},color,thickness:w});
    const text=(s,x,y,size=10,f=font,color=ink)=>page.drawText(s,{x,y,font:f,size,color});
    function half(top) {
      const y=v=>top-v; // Distancias en puntos desde el borde superior de cada mitad.
      page.drawRectangle({x:29,y:y(58),width:6,height:34,color:blue});
      text('SOCIOGRAMA',47,y(33),17,bold);
      text('HOJA DE ELECCIONES',47,y(49),8,bold,slate);
      text('Grupo:',35,y(81),10,bold);line(79,y(84),290,y(84));
      text('Fecha:',319,y(81),10,bold);line(355,y(84),555,y(84));
      text('Mi nombre o código:',35,y(111),10,bold);line(150,y(114),555,y(114));
      text('Elige 3 personas en cada bloque. No te elijas ni repitas personas.',35,y(137),9,font,slate);
      page.drawRectangle({x:32,y:y(167),width:255,height:18,color:soft});
      page.drawRectangle({x:306,y:y(167),width:255,height:18,color:soft});
      text('+  3 ELECCIONES POSITIVAS',41,y(154),10,bold,blue);
      text('−  3 ELECCIONES NEGATIVAS',315,y(154),10,bold,ink);
      text('Con quién prefiero realizar una actividad',35,y(183),8,font,slate);
      text('Con quién prefiero menos realizarla',309,y(183),8,font,slate);
      for(let i=0;i<3;i++) {
        const yy=y(218+i*34);
        text(String(i+1)+'.',40,yy,10,bold);line(59,yy-3,279,yy-3,slate,.7);
        text(String(i+1)+'.',314,yy,10,bold);line(333,yy-3,552,yy-3,slate,.7);
      }
      text('Pregunta o actividad:',35,y(338),9,bold);
      line(137,y(341),555,y(341));
      text('Responde de forma individual. Tus elecciones se tratarán de forma confidencial.',35,y(366),8,font,slate);
      text('La participación es voluntaria. Entrega esta mitad a la persona responsable.',35,y(385),8,font,slate);
    }
    half(841.89);half(420.945);
    const cy=420.945;
    // Corte justo en mitad del A4: trazos y dos guías de tijera no invasivas.
    for(let x=20;x<576;x+=13)line(x,cy,Math.min(x+7,576),cy,slate,.65);
    text('✂',4,cy+3,11,font,slate);
    text('✂',577,cy+3,11,font,slate);
    UI.descargar(await doc.save(),'sociograma-hoja-votaciones-2-por-a4.pdf','application/pdf');
    return 1; // Un único folio con dos mitades reutilizables.
  }
  return {descargar};
})();
