'use strict';
/* Una hoja A4 por persona. Todo se genera localmente en el navegador. */
window.CuestionarioPDF = (() => {
  let promise = null;
  async function preparar() {
    if (window.PDFLib && window.fontkit) return window.PDFLib;
    if (!promise) promise = Promise.all([
      ['PDFLib', 'vendor/pdf-lib.min.js'],
      ['fontkit', 'vendor/fontkit.umd.min.js']
    ].map(([nombre, url]) => new Promise((resolve, reject) => {
      if (window[nombre]) { resolve(); return; }
      const s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = () => reject(new Error('No se ha podido cargar el motor PDF.'));
      document.head.append(s);
    }))).then(() => window.PDFLib).catch(e => { promise = null; throw e; });
    return promise;
  }
  async function descargar(config) {
    const names = Sociometria.validarNombres(config.nombres);
    if (!config.grupo.trim()) throw new Error('Escribe el nombre o código del grupo.');
    if (!config.criterio.trim()) throw new Error('Escribe una pregunta de elección.');
    if (names.length < 7 || names.length > 40) throw new Error('Se necesitan entre 7 y 40 personas.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(config.fecha)) throw new Error('Indica una fecha válida.');
    const lib = await preparar(), doc = await lib.PDFDocument.create();
    doc.setTitle('SOCIOMAP - Cuestionarios individuales de votación');
    doc.setAuthor('SOCIOMAP · ARANDA TOOLS');
    doc.registerFontkit(window.fontkit);
    const bytes = await Promise.all(['DejaVuSans.ttf','DejaVuSans-Bold.ttf'].map(async file => {
      const res = await fetch('vendor/' + file);
      if (!res.ok) throw new Error('No se puede cargar la tipografía PDF.');
      return res.arrayBuffer();
    }));
    const normal = await doc.embedFont(bytes[0], { subset: true });
    const bold = await doc.embedFont(bytes[1], { subset: true });
    const allowed = new Set(normal.getCharacterSet());
    const clean = value => [...String(value).replace(/\s+/g,' ').trim()]
      .map(c => allowed.has(c.codePointAt(0)) ? c : '?').join('');
    const shorten = (value, font, size, max) => {
      let s = clean(value);
      if (font.widthOfTextAtSize(s,size) <= max) return s;
      while (s.length && font.widthOfTextAtSize(s + '…',size) > max) s=s.slice(0,-1);
      return s+'…';
    };
    const ink=lib.rgb(.08,.16,.28), mute=lib.rgb(.35,.43,.52),
      rule=lib.rgb(.81,.86,.91), blue=lib.rgb(.05,.37,.83), orange=lib.rgb(.67,.32,.19);
    const x=42, right=553, width=511;
    function write(page, value, left, y, font=normal, size=10, color=ink, max=width) {
      page.drawText(shorten(value,font,size,max),{x:left,y,font,size,color});
    }
    function section(page,title,subtitle,y,color,sign) {
      page.drawCircle({x:54,y:y+4,size:12,color});
      write(page,sign,sign==='+'?48:50,y-1,bold,14,lib.rgb(1,1,1),24);
      write(page,title,76,y+6,bold,12);
      write(page,subtitle,76,y-10,normal,9,mute);
      for (let k=0;k<3;k++){
        const yy=y-39-k*27;
        write(page,(k+1)+'.',54,yy+4,bold,10);
        page.drawLine({start:{x:82,y:yy},end:{x:right,y:yy},color:rule});
      }
    }
    const custom=names.some((v,i)=>v!=='P'+(i+1));
    for(let i=0;i<names.length;i++){
      const page=doc.addPage([595.28,841.89]);
      write(page,'SOCIOGRAMA',x,801,bold,20,ink,295);
      write(page,'CUESTIONARIO / HOJA '+(i+1)+' DE '+names.length,341,806,bold,8,mute,211);
      page.drawLine({start:{x,y:775},end:{x:right,y:775},color:rule});
      write(page,'Elecciones del grupo',x,745,bold,20);
      write(page,'Grupo: '+config.grupo,x,718,normal,10,ink,410);
      write(page,'Fecha: '+config.fecha.split('-').reverse().join('/'),x,699,normal,10);
      write(page,'Responde: P'+(i+1)+(custom?' · '+names[i]:''),213,699,bold,10,ink,337);
      write(page,'PREGUNTA',x,676,bold,9,mute);
      const q=clean(config.criterio), words=q.split(' ');
      let lines=[],line='';
      for(const word of words){
        const next=line?line+' '+word:word;
        if(normal.widthOfTextAtSize(next,10)>width && line){lines.push(line);line=word;}
        else line=next;
      }
      if(line) lines.push(line);
      lines.slice(0,4).forEach((part,k)=>write(page,part,x,662-14*k,normal,10));
      page.drawRectangle({x,y:581,width,height:30,color:lib.rgb(.94,.96,.99)});
      write(page,'Elige 3 personas en cada bloque, sin repetirte ni incluirte.',x+10,591,normal,9);
      section(page,'3 elecciones positivas','Con quienes prefieres hacer la actividad.',553,blue,'+');
      section(page,'3 elecciones negativas','Con quienes prefieres menos hacer la actividad.',426,orange,'-');
      write(page,'LISTA DE PERSONAS (NO TE INCLUYAS)',x,302,bold,9,mute);
      page.drawLine({start:{x,y:295},end:{x:right,y:295},color:rule});
      const candidates=names.map((name,k)=>({name,k})).filter(v=>v.k!==i);
      const half=Math.ceil(candidates.length/2);
      candidates.forEach(({name,k},j)=>{
        const col=Math.floor(j/half), row=j%half;
        write(page,'P'+(k+1)+(custom?'  '+name:''),x+col*260,280-row*10.8,normal,8,ink,243);
      });
      page.drawLine({start:{x,y:53},end:{x:right,y:53},color:rule});
      write(page,'Entrega esta hoja a la persona responsable. Las elecciones describen esta actividad, no a las personas.',x,37,normal,7.2,mute);
      write(page,'Participación voluntaria. Custodia las respuestas de forma confidencial.',x,24,normal,7.2,mute);
    }
    const pdf=await doc.save();
    const slug=config.grupo.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,35)||'grupo';
    UI.descargar(pdf,'sociomap-cuestionarios-'+slug+'-'+config.fecha+'.pdf','application/pdf');
    return names.length;
  }
  return { descargar };
})();
