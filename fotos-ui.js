'use strict';
/* Miniaturas locales, sin EXIF, metadatos ni subidas a servidores. */
window.FotosUI = (() => {
  const MAX_ORIGEN = 6 * 1024 * 1024;
  function aceptar(file) {
    if (!file || !['image/jpeg','image/png','image/webp'].includes(file.type))
      throw new Error('Selecciona una imagen JPG, PNG o WebP.');
    if (file.size > MAX_ORIGEN) throw new Error('La fotografía original supera 6 MB.');
  }
  async function procesar(file) {
    aceptar(file);
    const url = URL.createObjectURL(file);
    let imagen;
    try {
      imagen = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('La imagen no se puede abrir.'));
        img.src = url;
      });
      const w = imagen.naturalWidth, h = imagen.naturalHeight;
      if (!w || !h || w * h > 30e6) throw new Error('Resolución de imagen no admitida.');
      const lado = Math.min(w, h), sx = (w-lado)/2, sy=(h-lado)/2;
      const canvas = document.createElement('canvas');
      for (const [size, quality] of [[144,.72],[128,.62],[112,.52],[96,.42]]) {
        canvas.width=canvas.height=size;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('El navegador no permite procesar fotografías.');
        ctx.fillStyle='#fff'; ctx.fillRect(0,0,size,size);
        ctx.drawImage(imagen,sx,sy,lado,lado,0,0,size,size);
        // El lienzo nuevo elimina los metadatos EXIF y limita el almacenamiento.
        for (const format of ['image/webp','image/jpeg']) {
          const foto=canvas.toDataURL(format,quality);
          if (foto.length <= Sociometria.FOTO_MAX) return foto;
        }
      }
      throw new Error('La imagen no puede comprimirse al tamaño seguro. Prueba otra fotografía.');
    } finally { URL.revokeObjectURL(url); }
  }
  function foto(data, indice, anonimizada=false) {
    return anonimizada ? null : data.fotos?.[data.ids[indice]] || null;
  }
  function avatar(data,indice,anonimizada=false,clase='avatar-mini') {
    const src=foto(data,indice,anonimizada);
    if (src) return UI.el('img',{className:clase,src,alt:'',decoding:'async'});
    return UI.el('span',{className:clase+' avatar-placeholder','aria-hidden':'true'},'P'+(indice+1));
  }
  function persona(data,indice,anonimizada=false) {
    return UI.el('span',{className:'persona-con-foto'},avatar(data,indice,anonimizada),
      UI.el('span',{},UI.nombre(data,indice,anonimizada)));
  }
  return {procesar,foto,avatar,persona};
})();
