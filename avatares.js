'use strict';
/* Ocho retratos vectoriales inventados específicamente para la demostración.
   No proceden de personas reales ni son fotos de menores. */
window.Avatares = (() => {
  const personas=[
    {f:'#e8b58f',c:'#7191c2',p:'#ead4bb',h:'#302a32',s:'parted'},
    {f:'#7c4f38',c:'#e3a85d',p:'#e9ba8a',h:'#251d26',s:'curly'},
    {f:'#ca9074',c:'#7eb59b',p:'#edc8ad',h:'#3c3535',s:'fringe'},
    {f:'#6d4336',c:'#d69aa5',p:'#ba8c63',h:'#211e24',s:'high'},
    {f:'#edb99b',c:'#8a83bb',p:'#e2a67c',h:'#6a4a32',s:'short'},
    {f:'#a77053',c:'#72a6b7',p:'#d1a17e',h:'#26252b',s:'bun'},
    {f:'#d5a27b',c:'#bb9067',p:'#eac3a5',h:'#5b3a2e',s:'waves'},
    {f:'#8d5d46',c:'#b3a5c2',p:'#c99269',h:'#242025',s:'crop'}
  ];
  const cache=[];
  function porIndice(i) {
    const index=((i%8)+8)%8;
    if(cache[index])return cache[index];
    const v=personas[index];
    const bg=['#f3f0ed','#eef2f5','#f3f0e7','#f2e9eb'][index%4];
    const hair={
      parted:'<path d="M24 51Q20 20 48 19Q74 18 73 49L62 37Q46 40 34 34Z"/>',
      curly:'<g><circle cx="28" cy="39" r="12"/><circle cx="39" cy="25" r="13"/><circle cx="53" cy="25" r="13"/><circle cx="66" cy="36" r="11"/></g>',
      fringe:'<path d="M23 52Q19 23 49 20Q75 20 74 52L69 41Q59 43 53 33Q43 45 27 43Z"/>',
      high:'<path d="M24 51Q12 24 42 18Q76 8 74 51L70 35L50 30L30 38Z"/>',
      short:'<path d="M25 46Q26 18 52 20Q72 23 73 46L67 36L37 34Z"/>',
      bun:'<circle cx="50" cy="15" r="12"/><path d="M23 47Q19 20 52 21Q76 23 74 52L69 40L32 40Z"/>',
      waves:'<path d="M21 53Q16 15 51 19Q78 16 78 53L70 57L67 36Q48 27 30 40L27 56Z"/>',
      crop:'<path d="M25 43Q25 21 49 20Q73 20 72 45L63 33L32 36Z"/>'
    }[v.s];
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
<rect width="100" height="100" rx="50" fill="${bg}"/>
<path d="M6 101Q10 75 32 73H68Q92 75 94 101Z" fill="${v.c}"/>
<path d="M40 62H60V79Q50 91 40 79Z" fill="${v.f}"/>
<ellipse cx="50" cy="48" rx="26" ry="31" fill="${v.f}"/>
<g fill="${v.h}">${hair}</g>
<path d="M34 48h9m14 0h9" fill="none" stroke="#47342c" stroke-width="2.4" stroke-linecap="round"/>
<circle cx="40" cy="50" r="1.8" fill="#1c2732"/><circle cx="61" cy="50" r="1.8" fill="#1c2732"/>
<path d="M49 52q-4 9 2 9" fill="none" stroke="#8e604c" stroke-width="1.6" stroke-linecap="round"/>
<path d="M43 67q7 5 15 0" fill="none" stroke="#924f49" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;
    cache[index]='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
    return cache[index];
  }
  return {porIndice};
})();
