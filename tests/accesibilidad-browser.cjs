'use strict';
// Auditoría automática de criterios WCAG verificables con axe-core.
// No sustituye pruebas manuales NVDA/VoiceOver ni una certificación WCAG 2.2 AA.
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;
const S=require('../sociometria.js');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(e,data)=>{
  if(e){res.writeHead(404).end();return;}
  const type={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'}[path.extname(file)]||'application/octet-stream';
  res.setHeader('Content-Type',type);res.end(data);
 });
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const url='http://127.0.0.1:'+server.address().port;
 const chrome=process.env.CHROMIUM_EXECUTABLE_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
 const browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{})});
 const page=await browser.newPage({viewport:{width:1365,height:900}});
 const defects=[];
 try{
  const pages=['index.html','acceso.html','formulario.html','demo.html','instrucciones.html'];
  for(const p of pages){
   await page.goto(url+'/'+p);
   await page.waitForLoadState('networkidle');
   const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
   console.log('AXE',p,'violaciones',result.violations.length);
   for(const v of result.violations)defects.push({page:p,id:v.id,impact:v.impact,targets:v.nodes.slice(0,4).map(n=>n.target.join(', '))});
  }
  await page.goto(url+'/formulario.html');
  await page.evaluate(({key,datos})=>sessionStorage.setItem(key,JSON.stringify({datos})),
    {key:S.STORAGE_KEY,datos:S.demoPublica()});
  await page.goto(url+'/sociograma_interactivo.html');
  assert.equal(await page.locator('#graph [data-node]').count(),8);
  await page.selectOption('#participante','0');
  const app=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
  console.log('AXE sociograma_interactivo.html violaciones',app.violations.length);
  for(const v of app.violations)defects.push({page:'sociograma_interactivo.html',id:v.id,impact:v.impact,targets:v.nodes.slice(0,4).map(n=>n.target.join(', '))});
  if(defects.length){
    console.error('HALLAZGOS AUTOMÁTICOS',JSON.stringify(defects,null,2));
    process.exitCode=1;
  }else console.log('PASS AXE: seis pantallas sin violaciones automáticas de los criterios WCAG 2.2 seleccionados.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(err=>{console.error(err);server.close();process.exitCode=1;});
