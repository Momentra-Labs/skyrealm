const { chromium }=require('playwright');const {spawn}=require('node:child_process');const assert=require('node:assert/strict');
(async()=>{const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5178','--strictPort'],{windowsHide:true});let browser;
try{await new Promise((res,rej)=>{server.stdout.on('data',d=>{if(d.toString().includes('Local:'))res()});server.on('error',rej);server.on('exit',c=>rej(Error('Vite '+c)))});browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5178/');
// Cold landing visit must load the entire visible gallery without entering the game or selecting a card.
await page.locator('#guardians').scrollIntoViewIfNeeded();
await page.waitForFunction(()=>[...document.querySelectorAll('.lp-gcard img')].every(img=>img.complete&&img.naturalWidth>0));
await page.waitForFunction(async()=>{const {assets}=await import('/src/assets/AssetLoader.ts');const m=await import('/src/assets/assetManifest.ts');const t=await import('/src/types/game.ts');return Object.values(t.WorldId).every(id=>m.worldAssetUrls(id).every(u=>assets.has(u)))});
await page.locator('#guardians').scrollIntoViewIfNeeded();await page.screenshot({path:'docs/art/assets-guardian-gallery.png'});
await page.locator('#world').scrollIntoViewIfNeeded();await page.screenshot({path:'docs/art/assets-world-gallery.png'});
const report=await page.evaluate(async()=>{const {assets}=await import('/src/assets/AssetLoader.ts');const {allAssetUrls}=await import('/src/assets/assetManifest.ts');const urls=allAssetUrls();await assets.load(urls);return {total:urls.length,missing:urls.filter(u=>!assets.has(u))}});console.log(JSON.stringify(report));assert.deepEqual(report.missing,[]);assert.deepEqual(errors,[]);
}finally{await browser?.close();server.kill()}})().catch(e=>{console.error(e);process.exitCode=1});
