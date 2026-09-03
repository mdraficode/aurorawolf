import { chromium } from 'playwright';
import { pathToFileURL, fileURLToPath } from 'node:url';
const URL = pathToFileURL(fileURLToPath(import.meta.url) + '/../../../index.html').href + '?seed=7777&quality=low';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 960, height: 540 } });
await pg.addInitScript(()=>{try{localStorage.clear()}catch(e){}});
await pg.goto(URL,{waitUntil:'domcontentloaded',timeout:180000});
await pg.waitForFunction(()=>{const x=document.getElementById('btnStart');return x&&!x.disabled;},null,{timeout:180000});
console.log(await pg.evaluate(()=>{
  const row=document.getElementById('nameRow'), inp=document.getElementById('plName2');
  const r=inp?inp.getBoundingClientRect():null;
  return {rowDisplay: row?getComputedStyle(row).display:'no-row', rowInline: row?row.style.display:null,
          inp: !!inp, rect: r?{w:r.width,h:r.height,t:r.top,l:r.left}:null,
          vis: inp?getComputedStyle(inp).display+'/'+getComputedStyle(inp).visibility:null,
          campName: window.CAMP.state().name, ovMode: document.getElementById('overlay').dataset.mode,
          ovHidden: document.getElementById('overlay').classList.contains('hidden'),
          nPlName: document.querySelectorAll('#plName2').length};
}));
await b.close();
